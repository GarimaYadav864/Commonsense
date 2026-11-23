

const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Offer = require("../models/Offer");
const Request = require("../models/Request");
const {
  createNotification,
} = require("../services/notificationService");

// CREATE DELIVERY ARRANGEMENT

const createDelivery = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      offerId,
      method,
      pickupAddress,
      deliveryAddress,
      transportDetails,
      quotedCost,
    } = req.body;

    // Validate required fields.
    if (!offerId || !method) {
      return res.status(400).json({
        success: false,
        message: "Offer ID and delivery method are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID",
      });
    }

    if (!["self_pickup", "community_delivery"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery method",
      });
    }

    if (
      quotedCost !== undefined &&
      (!Number.isFinite(quotedCost) || quotedCost < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transportation cost",
      });
    }

    if (
      transportDetails !== undefined &&
      (typeof transportDetails !== "string" ||
        transportDetails.length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "Transport details must be a string of at most 500 characters",
      });
    }

    const cleanPickupAddress =
      typeof pickupAddress === "string" ? pickupAddress.trim() : "";

    const cleanDeliveryAddress =
      typeof deliveryAddress === "string" ? deliveryAddress.trim() : "";

    if (method === "self_pickup" && !cleanPickupAddress) {
      return res.status(400).json({
        success: false,
        message: "Pickup address is required",
      });
    }

    if (method === "community_delivery" && !cleanDeliveryAddress) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    if (
      (method === "self_pickup" && cleanPickupAddress.length > 500) ||
      (method === "community_delivery" && cleanDeliveryAddress.length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "Address cannot exceed 500 characters",
      });
    }

    let createdDelivery;

    await session.withTransaction(async () => {
      // Only a requester-confirmed accepted offer can become a delivery.
      const offer = await Offer.findOne({
        _id: offerId,
        requester: req.user._id,
        status: "accepted",
        requesterConfirmed: true,
      }).session(session);

      if (!offer) {
        throw new Error("CONFIRMED_OFFER_NOT_FOUND");
      }

      // Check for an existing arrangement.
      const existingDelivery = await Delivery.findOne({
        offer: offer._id,
      }).session(session);

      if (existingDelivery) {
        throw new Error("DELIVERY_ALREADY_EXISTS");
      }

      const deliveries = await Delivery.create(
        [
          {
            offer: offer._id,
            request: offer.request,
            provider: offer.provider,
            requester: offer.requester,
            method,
            pickupAddress:
              method === "self_pickup"
                ? cleanPickupAddress
                : undefined,
            deliveryAddress:
              method === "community_delivery"
                ? cleanDeliveryAddress
                : undefined,
            transportDetails: transportDetails?.trim() || undefined,
            quotedCost:
              method === "community_delivery"
                ? quotedCost ?? 0
                : 0,
          },
        ],
        { session }
      );

      createdDelivery = deliveries[0];
    });

    // Notify the provider after the transaction commits.
    const io = req.app.get("io");

    await Promise.allSettled([
      createNotification({
        io,
        recipient: createdDelivery.provider,
        type: "delivery_arranged",
        title: "Delivery arrangement created",
        message: "The requester has created a delivery arrangement for your accepted offer.",
        relatedId: createdDelivery._id,
        relatedModel: "Delivery",
      }),
    ]);

    return res.status(201).json({
      success: true,
      message: "Delivery arrangement created successfully",
      delivery: createdDelivery,
    });
  } catch (error) {
    console.error("Create delivery error:", error);

    if (error.message === "CONFIRMED_OFFER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Confirmed accepted offer not found",
      });
    }

    if (
      error.message === "DELIVERY_ALREADY_EXISTS" ||
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "A delivery arrangement already exists for this offer",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create delivery arrangement",
    });
  } finally {
    await session.endSession();
  }
};



// GET MY DELIVERIES
const getMyDeliveries = async (req, res) => {
  try {
    let filter;

    if (req.user.role === "provider") {
      filter = { provider: req.user._id };
    } else if (req.user.role === "volunteer") {
      filter = { volunteer: req.user._id };
    } else {
      filter = { requester: req.user._id };
    }

    const deliveries = await Delivery.find(filter)
      .populate("offer")
      .populate("request")
      .populate("provider", "name location")
      .populate("requester", "name location")
      .populate("volunteer", "name location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    console.error("Get deliveries error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch deliveries",
    });
  }
};


// GET AVAILABLE DELIVERIES FOR VOLUNTEERS

const getAvailableDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      method: "community_delivery",
      status: "arranged",
      volunteer: null,
    })
      .select("_id request method status createdAt")
      .populate({
        path: "request",
        select: "title description category quantity unit location",
      })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    console.error("Available deliveries error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch available deliveries",
    });
  }
};


// VOLUNTEER CLAIMS DELIVERY

const claimDelivery = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID",
      });
    }

    // Atomic claim: only one volunteer can claim an unassigned delivery.
    const delivery = await Delivery.findOneAndUpdate(
      {
        _id: req.params.id,
        method: "community_delivery",
        status: "arranged",
        volunteer: null,
      },
      {
        $set: {
          volunteer: req.user._id,
          volunteerAssignedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("request")
      .populate("provider", "name location")
      .populate("requester", "name location")
      .populate("volunteer", "name location");

    if (!delivery) {
      return res.status(409).json({
        success: false,
        message:
          "This delivery is already claimed or is no longer available.",
      });
    }

    const io = req.app.get("io");

    // Notifications are best-effort. A notification failure
    // must not make a successful assignment look unsuccessful.
    await Promise.allSettled([
      createNotification({
        io,
        recipient: delivery.requester?._id || delivery.requester,
        type: "delivery_claimed",
        title: "Volunteer assigned",
        message: "A volunteer has claimed your delivery.",
        relatedId: delivery._id,
        relatedModel: "Delivery",
      }),

      createNotification({
        io,
        recipient: delivery.provider?._id || delivery.provider,
        type: "delivery_claimed",
        title: "Delivery volunteer assigned",
        message: "A volunteer has claimed a delivery for your resource.",
        relatedId: delivery._id,
        relatedModel: "Delivery",
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Delivery successfully assigned to you.",
      delivery,
    });
  } catch (error) {
    console.error("Claim delivery error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to claim delivery",
    });
  }
};



// PROVIDER MARKS DELIVERY AS DISPATCHED


const markDispatched = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID",
      });
    }

    const delivery = await Delivery.findOneAndUpdate(
      {
        _id: req.params.id,
        provider: req.user._id,
        status: "arranged",
        $or: [
          { method: "self_pickup" },
          {
            method: "community_delivery",
            volunteer: { $ne: null },
          },
        ],
      },
      {
        $set: {
          status: "dispatched",
          providerConfirmed: true,
          dispatchedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!delivery) {
      return res.status(409).json({
        success: false,
        message:
          "Delivery cannot be dispatched. It may already be dispatched, unavailable, or awaiting volunteer assignment.",
      });
    }

    const io = req.app.get("io");

    await Promise.allSettled([
      createNotification({
        io,
        recipient: delivery.requester,
        type: "delivery_dispatched",
        title: "Delivery dispatched",
        message: "Your delivery has been dispatched.",
        relatedId: delivery._id,
        relatedModel: "Delivery",
      }),

      ...(delivery.volunteer
        ? [
            createNotification({
              io,
              recipient: delivery.volunteer,
              type: "delivery_dispatched",
              title: "Delivery dispatched",
              message: "The provider has dispatched your assigned delivery.",
              relatedId: delivery._id,
              relatedModel: "Delivery",
            }),
          ]
        : []),
    ]);

    return res.status(200).json({
      success: true,
      message: "Delivery marked as dispatched",
      delivery,
    });
  } catch (error) {
    console.error("Dispatch error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update delivery",
    });
  }
};





// VOLUNTEER UPDATES DELIVERY PROGRESS
const updateVolunteerDeliveryStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    }

    const { status } = req.body;
    if (!["in_transit", "delivered"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be in_transit or delivered",
      });
    }

    const allowedPreviousStatuses =
      status === "in_transit" ? ["dispatched"] : ["in_transit"];

    const update = { status };
    if (status === "delivered") update.deliveredAt = new Date();

    const delivery = await Delivery.findOneAndUpdate(
      {
        _id: req.params.id,
        volunteer: req.user._id,
        method: "community_delivery",
        status: { $in: allowedPreviousStatuses },
      },
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate("request")
      .populate("provider", "name")
      .populate("requester", "name")
      .populate("volunteer", "name");

    if (!delivery) {
      return res.status(409).json({
        success: false,
        message: "This delivery cannot move to that status. Check its current status and your assignment.",
      });
    }

    const io = req.app.get("io");
    const label = status === "in_transit" ? "in transit" : "marked delivered";
    await Promise.allSettled([
      createNotification({
        io,
        recipient: delivery.requester?._id || delivery.requester,
        type: "delivery_status_updated",
        title: status === "in_transit" ? "Your delivery is in transit" : "Your delivery has arrived",
        message: status === "in_transit"
          ? "Your assigned volunteer has started the delivery."
          : "Your assigned volunteer has marked the resource as delivered. Please confirm receipt.",
        relatedId: delivery._id,
        relatedModel: "Delivery",
      }),
      createNotification({
        io,
        recipient: delivery.provider?._id || delivery.provider,
        type: "delivery_status_updated",
        title: "Delivery progress updated",
        message: `The volunteer has ${label}.`,
        relatedId: delivery._id,
        relatedModel: "Delivery",
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: status === "in_transit" ? "Delivery marked as in transit." : "Delivery marked as delivered.",
      delivery,
    });
  } catch (error) {
    console.error("Volunteer delivery status error:", error);
    return res.status(500).json({ success: false, message: "Unable to update delivery status" });
  }
};

// REQUESTER CONFIRMS RECEIPT


const confirmReceipt = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid delivery ID",
    });
  }

  const session = await mongoose.startSession();


  try {
    let completedDelivery;

    await session.withTransaction(async () => {
      const delivery = await Delivery.findOneAndUpdate(
        {
          _id: req.params.id,
          requester: req.user._id,
          status: { $in: ["dispatched", "in_transit", "delivered"] },
          requesterConfirmed: false,
        },
        {
          $set: {
            requesterConfirmed: true,
            status: "received",
            receivedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!delivery) {
        const error = new Error("DELIVERY_NOT_FOUND");
        throw error;
      }

      const request = await Request.findOneAndUpdate(
        {
          _id: delivery.request,
          requester: req.user._id,
          status: "offered",
        },
        {
          $set: { status: "fulfilled" },
        },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!request) {
        throw new Error("REQUEST_NOT_FOUND_OR_INACTIVE");
      }

      completedDelivery = delivery;
    });

    const io = req.app.get("io");

    await Promise.allSettled([
      createNotification({
        io,
        recipient: completedDelivery.provider,
        type: "delivery_received",
        title: "Delivery completed",
        message: "The requester has confirmed receipt.",
        relatedId: completedDelivery._id,
        relatedModel: "Delivery",
      }),

      ...(completedDelivery.volunteer
        ? [
            createNotification({
              io,
              recipient: completedDelivery.volunteer,
              type: "delivery_received",
              title: "Delivery completed",
              message: "The requester has confirmed receipt of the delivery.",
              relatedId: completedDelivery._id,
              relatedModel: "Delivery",
            }),
          ]
        : []),
    ]);

    return res.status(200).json({
      success: true,
      message: "Receipt confirmed. Request fulfilled successfully.",
      delivery: completedDelivery,
    });
  } catch (error) {
    console.error("Receipt confirmation error:", error);

    if (error.message === "DELIVERY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Dispatched delivery not found or receipt already confirmed",
      });
    }

    if (error.message === "REQUEST_NOT_FOUND_OR_INACTIVE") {
      return res.status(409).json({
        success: false,
        message: "Associated request could not be fulfilled",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to confirm receipt",
    });
  } finally {
    await session.endSession();
  }
};



module.exports = {
  createDelivery,
  getMyDeliveries,
  getAvailableDeliveries,
  claimDelivery,
  markDispatched,
  updateVolunteerDeliveryStatus,
  confirmReceipt,
};
