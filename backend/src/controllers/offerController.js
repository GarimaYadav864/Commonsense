const mongoose = require("mongoose");

const Offer = require("../models/Offer");
const Request = require("../models/Request");
const Resource = require("../models/Resource");
const Delivery = require("../models/Delivery");

const { getAIMatches } = require("../services/aiMatchingService");
const { sendNotification } = require("../services/notificationService");

// --------------------------------------------------
// 1. SAFE NOTIFICATION HELPER
// --------------------------------------------------

const notifySafely = async (io, notificationData) => {
  try {
    await sendNotification(io, notificationData);
  } catch (error) {
    console.error("Notification delivery error:", error.message);
  }
};

// --------------------------------------------------
// 2. SHARED AI NEXT-OFFER MATCHING
// Used after rejection and expiry.
// --------------------------------------------------

const createNextOfferForRequest = async (requestId, io) => {
  const request = await Request.findById(requestId);

  if (!request || request.status !== "matching") {
    return {
      success: false,
      message: "Request is not available for matching",
    };
  }

  // Exclude all resources previously offered for this request.
  const previousOffers = await Offer.find({
    request: request._id,
  }).select("resource");

  const excludedResourceIds = previousOffers.map(
    (item) => item.resource
  );

  // Get candidates from the Python AI service.
  const aiResult = await getAIMatches(
    request,
    excludedResourceIds
  );

  if (!aiResult.matches || !aiResult.matches.length) {
    await Request.findOneAndUpdate(
      {
        _id: request._id,
        status: "matching",
      },
      {
        $set: { status: "pending" },
      }
    );

    return {
      success: true,
      offer: null,
      message: "No more eligible providers are available",
    };
  }

  // Try candidates in AI ranking order.
  for (const candidate of aiResult.matches) {
    const session = await mongoose.startSession();

    let createdOffer;
    let selectedResource;

    try {
      await session.withTransaction(async () => {
        // Only one process can claim this request.
        const claimedRequest = await Request.findOneAndUpdate(
          {
            _id: request._id,
            status: "matching",
          },
          {
            $set: { status: "offered" },
          },
          {
            new: true,
            session,
          }
        );

        if (!claimedRequest) {
          throw new Error("REQUEST_ALREADY_CLAIMED");
        }

        // Revalidate resource ownership and stock.
        selectedResource = await Resource.findOne({
          _id: candidate.resource_id,
          provider: candidate.provider_id,
          status: "available",
          providerAvailability: "active",
          category: claimedRequest.category.toLowerCase(),
          quantity: { $gte: claimedRequest.quantity },
        }).session(session);

        if (!selectedResource) {
          throw new Error("RESOURCE_UNAVAILABLE");
        }

        const offers = await Offer.create(
          [
            {
              request: claimedRequest._id,
              resource: selectedResource._id,
              requester: claimedRequest.requester,
              provider: selectedResource.provider,
              quantity: claimedRequest.quantity,
            },
          ],
          { session }
        );

        createdOffer = offers[0];
      });

      // Transaction committed.
      await notifySafely(io, {
        recipient: selectedResource.provider,
        title: "New resource offer",
        message: `You have received an offer for ${request.title}.`,
        type: "offer_received",
        relatedId: createdOffer._id,
      });

      return {
        success: true,
        offer: createdOffer,
        ranking: {
          score: candidate.score,
          reasons: candidate.reasons,
          distanceKm: candidate.distance_km,
        },
        message: "Next AI-ranked provider has been contacted",
      };
    } catch (error) {
      if (error.message === "REQUEST_ALREADY_CLAIMED") {
        return {
          success: false,
          message: "Another process has already claimed this request",
        };
      }

      if (error.code === 11000) {
        return {
          success: false,
          message: "Duplicate offer prevented by database",
        };
      }

      if (error.message !== "RESOURCE_UNAVAILABLE") {
        throw error;
      }

      // This candidate is no longer eligible.
      // Try the next AI-ranked candidate.
      console.log(
        "Skipping unavailable AI candidate:",
        candidate.resource_id
      );
    } finally {
      await session.endSession();
    }
  }

  // No AI candidate passed the final availability check.
  await Request.findOneAndUpdate(
    {
      _id: request._id,
      status: "matching",
    },
    {
      $set: { status: "pending" },
    }
  );

  return {
    success: true,
    offer: null,
    message: "No currently available AI-ranked resources found",
  };
};

// --------------------------------------------------
// 3. START INITIAL OFFER PROCESS
// --------------------------------------------------

const startOfferProcess = async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.requestId,
      requester: req.user._id,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (!["pending", "matching"].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: "Request is not available for matching",
      });
    }

    const existingPending = await Offer.findOne({
      request: request._id,
      status: "pending",
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "An offer is already awaiting provider response",
        offer: existingPending,
      });
    }

    // Atomically move pending request into matching.
    if (request.status === "pending") {
      const claimed = await Request.findOneAndUpdate(
        {
          _id: request._id,
          requester: req.user._id,
          status: "pending",
        },
        {
          $set: { status: "matching" },
        },
        { new: true }
      );

      if (!claimed) {
        return res.status(409).json({
          success: false,
          message: "Another matching process is already running",
        });
      }
    }

    const result = await createNextOfferForRequest(
      request._id,
      req.app.get("io")
    );

    if (!result.success) {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(result.offer ? 201 : 200).json({
      success: true,
      message: result.message,
      ranking: result.ranking || null,
      offer: result.offer,
    });
  } catch (error) {
    console.error("Start offer process error:", error);

    // Restore the request if matching failed before an offer was created.
    try {
      await Request.findOneAndUpdate(
        {
          _id: req.params.requestId,
          requester: req.user._id,
          status: "matching",
        },
        {
          $set: { status: "pending" },
        }
      );
    } catch (recoveryError) {
      console.error(
        "Unable to restore request status after matching failure:",
        recoveryError
      );
    }

    return res.status(502).json({
      success: false,
      message: "Unable to complete AI-powered offer matching. Please try again.",
    });
  }
};

// --------------------------------------------------
// 4. PROVIDER ACCEPTS OR REJECTS OFFER
// --------------------------------------------------

const respondToOffer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { response } = req.body;

    if (!["accepted", "rejected"].includes(response)) {
      return res.status(400).json({
        success: false,
        message: "Response must be accepted or rejected",
      });
    }

    let result;

    await session.withTransaction(async () => {
      const offer = await Offer.findOne({
        _id: req.params.offerId,
        provider: req.user._id,
        status: "pending",
        expiresAt: { $gt: new Date() },
      }).session(session);

      if (!offer) {
        throw new Error("OFFER_NOT_FOUND");
      }

      const request = await Request.findById(
        offer.request
      ).session(session);

      if (!request || request.status !== "offered") {
        throw new Error("REQUEST_NOT_ACTIVE");
      }

      if (response === "accepted") {
        // Reserve resource quantity atomically.
        const resource = await Resource.findOneAndUpdate(
          {
            _id: offer.resource,
            provider: req.user._id,
            providerAvailability: { $ne: "paused" },
            status: "available",
            quantity: { $gte: offer.quantity },
          },
          [
            {
              $set: {
                quantity: {
                  $subtract: ["$quantity", offer.quantity],
                },
              },
            },
            {
              $set: {
                status: {
                  $cond: [
                    { $eq: ["$quantity", 0] },
                    "unavailable",
                    "available",
                  ],
                },
              },
            },
          ],
          {
            new: true,
            session,
          }
        );

        if (!resource) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const acceptedAt = new Date();

        offer.status = "accepted";
        offer.respondedAt = acceptedAt;
        offer.requesterConfirmationExpiresAt = new Date(
          acceptedAt.getTime() + 24 * 60 * 60 * 1000
        );

        await offer.save({ session });

        result = {
          status: "accepted",
          offer,
          message: "Offer accepted and quantity reserved",
        };
      } else {
        offer.status = "rejected";
        offer.respondedAt = new Date();

        await offer.save({ session });

        request.status = "matching";
        await request.save({ session });

        result = {
          status: "rejected",
          offer,
          message: "Provider rejected the offer",
        };
      }
    });

    await session.endSession();

    // Provider accepted.
    if (result.status === "accepted") {
      await notifySafely(req.app.get("io"), {
        recipient: result.offer.requester,
        title: "Provider accepted your request",
        message: "A provider has accepted your resource request.",
        type: "offer_accepted",
        relatedId: result.offer._id,
      });

      return res.status(200).json({
        success: true,
        ...result,
      });
    }

    // Provider rejected: find the next AI-ranked provider.
    await notifySafely(req.app.get("io"), {
      recipient: result.offer.requester,
      title: "Provider declined your request",
      message: result.message,
      type: "offer_rejected",
      relatedId: result.offer._id,
    });

    try {
      const nextResult = await createNextOfferForRequest(
        result.offer.request,
        req.app.get("io")
      );

      result.nextOffer = nextResult.offer || null;
      result.message = nextResult.message;
      result.matchingError = !nextResult.success;
    } catch (matchingError) {
      console.error(
        "Next AI matching failed:",
        matchingError.message
      );

      result.message =
        "Offer rejected, but the next match could not be generated. Please retry matching.";

      result.matchingError = true;
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Offer response error:", error);

    const messages = {
      OFFER_NOT_FOUND: [
        404,
        "Pending offer not found, or its response window has expired",
      ],
      REQUEST_NOT_ACTIVE: [
        409,
        "Request is no longer active",
      ],
      INSUFFICIENT_STOCK: [
        409,
        "Resource quantity is no longer sufficient",
      ],
    };

    const [status, message] = messages[error.message] || [
      500,
      "Unable to process offer response",
    ];

    return res.status(status).json({
      success: false,
      message,
    });
  } finally {
    await session.endSession();
  }
};

// --------------------------------------------------
// 5. REQUESTER CONFIRMS ACCEPTED OFFER
// --------------------------------------------------

const confirmOffer = async (req, res) => {
  try {
    const offer = await Offer.findOneAndUpdate(
      {
        _id: req.params.offerId,
        requester: req.user._id,
        status: "accepted",
        requesterConfirmed: false,
        requesterConfirmationExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          requesterConfirmed: true,
          requesterConfirmedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Accepted offer not found, already confirmed, or confirmation window expired",
      });
    }

    await notifySafely(req.app.get("io"), {
      recipient: offer.provider,
      title: "Requester confirmed the offer",
      message: "The requester has confirmed your offer. You can proceed with delivery arrangements.",
      type: "offer_accepted",
      relatedId: offer._id,
    });

    return res.status(200).json({
      success: true,
      message: "Offer confirmed successfully",
      offer,
    });
  } catch (error) {
    console.error("Confirm offer error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to confirm offer",
    });
  }
};

// --------------------------------------------------
// 6. PROVIDER VIEWS PENDING OFFERS
// --------------------------------------------------

const getMyOffers = async (req, res) => {
  try {
    const offers = await Offer.find({
      provider: req.user._id,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("request")
      .populate("resource")
      .populate("requester", "name location")
      .sort({ offeredAt: 1 });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error("Get offers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch offers",
    });
  }
};



// PROVIDER VIEWS COMPLETE OFFER HISTORY
const getMyProviderOffers = async (req, res) => {
  try {
    const offers = await Offer.find({
      provider: req.user._id,
    })
      .populate("request", "title category location urgency")
      .populate("resource", "title category quantity unit")
      .populate("requester", "name location")
      .sort({ offeredAt: -1 });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error("Get provider offer history error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your offer history",
    });
  }
};


// --------------------------------------------------
// 7. REQUESTER CANCELS OFFER
// --------------------------------------------------

const cancelOffer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let cancelledOffer;

    await session.withTransaction(async () => {
      const offer = await Offer.findOne({
        _id: req.params.offerId,
        requester: req.user._id,
        status: { $in: ["pending", "accepted"] },
      }).session(session);

      if (!offer) {
        const error = new Error("ACTIVE_OFFER_NOT_FOUND");
        error.statusCode = 404;
        throw error;
      }

      const delivery = await Delivery.findOne({
        offer: offer._id,
      }).session(session);

      if (delivery && delivery.status !== "arranged") {
        const error = new Error("CANCELLATION_NOT_ALLOWED");
        error.statusCode = 409;
        throw error;
      }

      
// Restore stock atomically only for an accepted offer.
      if (offer.status === "accepted") {
        const restoredResource = await Resource.findByIdAndUpdate(
          offer.resource,
          [
            {
              $set: {
                quantity: {
                  $add: ["$quantity", offer.quantity],
                },
              },
            },
            {
              $set: {
                status: {
                  $cond: [
                    { $gt: ["$quantity", 0] },
                    "available",
                    "unavailable",
                  ],
                },
              },
            },
          ],
          {
            new: true,
            session,
          }
        );

        if (!restoredResource) {
          throw new Error("RESOURCE_NOT_FOUND");
        }
      }

      offer.status = "cancelled";
      await offer.save({ session });

      if (delivery) {
        delivery.status = "cancelled";
        await delivery.save({ session });
      }

      await Request.findOneAndUpdate(
        {
          _id: offer.request,
          requester: req.user._id,
        },
        {
          $set: { status: "cancelled" },
        },
        {
          session,
          runValidators: true,
        }
      );

      cancelledOffer = offer;
    });

    await notifySafely(req.app.get("io"), {
      recipient: cancelledOffer.provider,
      title: "Offer cancelled",
      message: "The requester has cancelled the offer.",
      type: "request_update",
      relatedId: cancelledOffer._id,
    });

    return res.status(200).json({
      success: true,
      message: "Offer cancelled and reserved quantity restored successfully",
    });
  } catch (error) {
    console.error("Cancel offer error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to cancel offer",
    });
  } finally {
    await session.endSession();
  }
};

// --------------------------------------------------
// 8. PROCESS EXPIRED OFFERS
// Called by the scheduled expiry worker.
// --------------------------------------------------

const processExpiredOffers = async (io) => {
  const now = new Date();

  const expiredOffers = await Offer.find({
    status: "pending",
    expiresAt: { $lte: now },
  }).select("_id request provider requester");

  let processed = 0;

  for (const item of expiredOffers) {
    const session = await mongoose.startSession();

    let expiredOffer;
    let shouldContinueMatching = false;

    try {
      await session.withTransaction(async () => {
        // Atomically expire only offers still pending.
        expiredOffer = await Offer.findOneAndUpdate(
          {
            _id: item._id,
            status: "pending",
            expiresAt: { $lte: new Date() },
          },
          {
            $set: {
              status: "expired",
              respondedAt: new Date(),
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!expiredOffer) {
          return;
        }

        // Reopen matching only if this request is still offered.
        const request = await Request.findOneAndUpdate(
          {
            _id: expiredOffer.request,
            status: "offered",
          },
          {
            $set: { status: "matching" },
          },
          {
            new: true,
            session,
          }
        );

        shouldContinueMatching = Boolean(request);
      });

      if (!expiredOffer) {
        continue;
      }

      processed++;

      await notifySafely(io, {
        recipient: expiredOffer.provider,
        title: "Offer expired",
        message: "The response window for this offer has expired.",
        type: "offer_rejected",
        relatedId: expiredOffer._id,
      });

      await notifySafely(io, {
        recipient: expiredOffer.requester,
        title: "Provider response window expired",
        message: "The offer expired without a response. We are checking for another provider.",
        type: "request_update",
        relatedId: expiredOffer._id,
      });

      // Use the same AI matching workflow as rejection.
      if (shouldContinueMatching) {
        try {
          await createNextOfferForRequest(
            expiredOffer.request,
            io
          );
        } catch (matchingError) {
          console.error(
            "Matching after expiry failed:",
            matchingError.message
          );
        }
      }
    } catch (error) {
      console.error(
        "Offer expiry processing error:",
        error.message
      );
    } finally {
      await session.endSession();
    }
  }

  
  // --------------------------------------------------
  // EXPIRE ACCEPTED OFFERS AWAITING REQUESTER CONFIRMATION
  // --------------------------------------------------

  const confirmationExpiredOffers = await Offer.find({
    status: "accepted",
    requesterConfirmed: false,
    requesterConfirmationExpiresAt: { $lte: now },
  }).select("_id request resource requester provider quantity");

  for (const item of confirmationExpiredOffers) {
    const session = await mongoose.startSession();

    let expiredOffer;
    let shouldContinueMatching = false;

    try {
      await session.withTransaction(async () => {
        // Claim the expiry atomically to prevent duplicate stock restoration.
        expiredOffer = await Offer.findOneAndUpdate(
          {
            _id: item._id,
            status: "accepted",
            requesterConfirmed: false,
            requesterConfirmationExpiresAt: { $lte: new Date() },
          },
          {
            $set: {
              status: "expired",
              respondedAt: new Date(),
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!expiredOffer) {
          return;
        }

        // Restore the quantity reserved when the provider accepted.
        const restoredResource = await Resource.findByIdAndUpdate(
          expiredOffer.resource,
          [
            {
              $set: {
                quantity: {
                  $add: ["$quantity", expiredOffer.quantity],
                },
              },
            },
            {
              $set: {
                status: {
                  $cond: [
                    { $gt: ["$quantity", 0] },
                    "available",
                    "unavailable",
                  ],
                },
              },
            },
          ],
          {
            new: true,
            session,
          }
        );

        if (!restoredResource) {
          throw new Error("RESOURCE_NOT_FOUND_DURING_STOCK_RESTORATION");
        }

        // Reopen the request only if it is still awaiting this offer.
        const request = await Request.findOneAndUpdate(
          {
            _id: expiredOffer.request,
            status: "offered",
          },
          {
            $set: { status: "matching" },
          },
          {
            new: true,
            session,
          }
        );

        shouldContinueMatching = Boolean(request);
      });

      if (!expiredOffer) {
        continue;
      }

      processed++;

      await notifySafely(io, {
        recipient: expiredOffer.requester,
        title: "Offer confirmation expired",
        message:
          "The confirmation window expired. Your request is being matched with another provider.",
        type: "request_update",
        relatedId: expiredOffer._id,
      });

      await notifySafely(io, {
        recipient: expiredOffer.provider,
        title: "Offer confirmation expired",
        message:
          "The requester did not confirm within 24 hours. Your reserved stock has been restored.",
        type: "offer_rejected",
        relatedId: expiredOffer._id,
      });

      if (shouldContinueMatching) {
        try {
          await createNextOfferForRequest(
            expiredOffer.request,
            io
          );
        } catch (matchingError) {
          console.error(
            "Matching after requester confirmation expiry failed:",
            matchingError.message
          );
        }
      }
    } catch (error) {
      console.error(
        "Requester confirmation expiry error:",
        error.message
      );
    } finally {
      await session.endSession();
    }
  }


  return {
    success: true,
    processed,
  };
};


const getMyRequesterOffers = async (req, res) => {
  try {
    const offers = await Offer.find({
      requester: req.user._id,
    })
      .populate("request", "title description category location urgency")
      .populate(
        "resource",
        "title description category quantity unit location condition"
      )
      .populate("provider", "name location")
      .sort({ offeredAt: -1 });

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error("Get requester offers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your offers.",
    });
  }
};


// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  startOfferProcess,
  respondToOffer,
  getMyOffers,
  getMyProviderOffers,
  confirmOffer,
  cancelOffer,
  processExpiredOffers,
  getMyRequesterOffers,
};
