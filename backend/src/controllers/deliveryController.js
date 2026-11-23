

const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Offer = require("../models/Offer");
const Request = require("../models/Request");
const {
  createNotification,
} = require("../services/notificationService");

const DELIVERY_BASE_FARE_INR = 20;
const DELIVERY_RATE_PER_KM_INR = 8;
const ROAD_DISTANCE_FACTOR = 1.25;

const calculateDeliveryQuote = (resource, request) => {
  const values = [resource && resource.latitude, resource && resource.longitude, request && request.latitude, request && request.longitude];
  if (!values.every(Number.isFinite)) {
    const error = new Error("GPS coordinates are missing for the provider or requester. Save both locations before calculating delivery charges.");
    error.code = "DELIVERY_COORDINATES_MISSING";
    throw error;
  }
  const rad = (value) => value * Math.PI / 180;
  const lat1 = rad(resource.latitude);
  const lat2 = rad(request.latitude);
  const dLat = rad(request.latitude - resource.latitude);
  const dLon = rad(request.longitude - resource.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const straightLineKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(straightLineKm * ROAD_DISTANCE_FACTOR * 10) / 10;
  const distanceCharge = distanceKm * DELIVERY_RATE_PER_KM_INR;
  return { straightLineKm: Math.round(straightLineKm * 10) / 10, distanceKm, baseFare: DELIVERY_BASE_FARE_INR, ratePerKm: DELIVERY_RATE_PER_KM_INR, distanceCharge: Math.round(distanceCharge * 100) / 100, roadDistanceFactor: ROAD_DISTANCE_FACTOR, quotedCost: Math.max(DELIVERY_BASE_FARE_INR, Math.round(DELIVERY_BASE_FARE_INR + distanceCharge)), costCurrency: "INR", pricingMethod: "gps_estimate" };
};

const quoteDelivery = async (req, res) => {
  try {
    const offerId = req.body.offerId;
    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) return res.status(400).json({ success: false, message: "A valid offer ID is required" });
    const offer = await Offer.findOne({ _id: offerId, requester: req.user._id, status: "accepted", requesterConfirmed: true }).populate("resource").populate("request");
    if (!offer) return res.status(404).json({ success: false, message: "Confirmed accepted offer not found" });
    return res.status(200).json({ success: true, quote: calculateDeliveryQuote(offer.resource, offer.request) });
  } catch (error) {
    if (error.code === "DELIVERY_COORDINATES_MISSING") return res.status(422).json({ success: false, message: error.message });
    console.error("Delivery quote error:", error);
    return res.status(500).json({ success: false, message: "Unable to calculate delivery estimate" });
  }
};
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
      }).populate("resource").populate("request").session(session);

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

      const deliveryQuote = method === "community_delivery" ? calculateDeliveryQuote(offer.resource, offer.request) : { quotedCost: 0, pricingMethod: "self_pickup" };

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
            quotedCost: deliveryQuote.quotedCost,
            distanceKm: deliveryQuote.distanceKm,
            pricingMethod: deliveryQuote.pricingMethod,
            costBreakdown: method === "community_delivery" ? {
              baseFare: deliveryQuote.baseFare,
              ratePerKm: deliveryQuote.ratePerKm,
              distanceCharge: deliveryQuote.distanceCharge,
              straightLineKm: deliveryQuote.straightLineKm,
              roadDistanceFactor: deliveryQuote.roadDistanceFactor,
            } : undefined,
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

    if (error.code === "DELIVERY_COORDINATES_MISSING") return res.status(422).json({ success: false, message: error.message });

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
        dispatchConditionReport: { $ne: null },
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


const updateVolunteerLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (
      typeof latitude !== "number" || typeof longitude !== "number" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    ) {
      return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" });
    }
    const delivery = await Delivery.findOneAndUpdate(
      { _id: req.params.id, volunteer: req.user._id, method: "community_delivery", status: "in_transit" },
      { $set: {
        "volunteerLocation.latitude": latitude,
        "volunteerLocation.longitude": longitude,
        "volunteerLocation.updatedAt": new Date(),
      } },
      { new: true, runValidators: true }
    ).select("_id volunteerLocation status");
    if (!delivery) {
      return res.status(409).json({ success: false, message: "Location can only be shared by the assigned volunteer while the delivery is in transit." });
    }
    return res.status(200).json({ success: true, message: "Location updated", volunteerLocation: delivery.volunteerLocation });
  } catch (error) {
    console.error("Volunteer location update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update volunteer location" });
  }
};

const submitConditionReport = async (req, res) => {
  try {
    const { stage, condition, notes = "", photos = [] } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    if (!["dispatch", "receipt"].includes(stage) || !["good", "fair", "damaged", "missing"].includes(condition)) return res.status(400).json({ success: false, message: "Choose a valid report stage and condition" });
    if (typeof notes !== "string" || notes.length > 1000 || !Array.isArray(photos) || photos.length > 3) return res.status(400).json({ success: false, message: "Notes must be under 1000 characters and up to 3 photos are allowed" });
    const validPhotos = photos.every((photo) => typeof photo === "string" && photo.length <= 500000 && /^data:image\\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(photo));
    if (!validPhotos) return res.status(400).json({ success: false, message: "Each photo must be a JPEG, PNG or WebP image under 350 KB" });
    const isProvider = stage === "dispatch" && req.user.role === "provider";
    const isRequester = stage === "receipt" && req.user.role === "requester";
    if (!isProvider && !isRequester) return res.status(403).json({ success: false, message: "You are not allowed to submit this condition report" });
    const reportField = stage === "dispatch" ? "dispatchConditionReport" : "receiptConditionReport";
    const filter = { _id: req.params.id, [reportField]: null };
    if (stage === "dispatch") Object.assign(filter, { provider: req.user._id, status: "arranged" });
    else Object.assign(filter, { requester: req.user._id, status: { $in: ["dispatched", "in_transit", "delivered"] }, requesterConfirmed: false });
    const report = { condition, notes: notes.trim(), photos, reportedBy: req.user._id, reportedAt: new Date() };
    const delivery = await Delivery.findOneAndUpdate(filter, { $set: { [reportField]: report } }, { new: true, runValidators: true });
    if (!delivery) return res.status(409).json({ success: false, message: "Report already submitted or delivery is not at the correct handover stage" });
    const recipient = stage === "dispatch" ? delivery.requester : delivery.provider;
    await Promise.allSettled([createNotification({ io: req.app.get("io"), recipient, type: "delivery_condition_reported", title: stage === "dispatch" ? "Pre-dispatch condition recorded" : "Arrival condition recorded", message: stage === "dispatch" ? "The provider recorded the resource condition before dispatch." : "The requester recorded the resource condition on arrival.", relatedId: delivery._id, relatedModel: "Delivery" })]);
    return res.status(200).json({ success: true, message: "Condition report saved", delivery });
  } catch (error) {
    console.error("Condition report error:", error);
    return res.status(500).json({ success: false, message: "Unable to save condition report" });
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
          receiptConditionReport: { $ne: null },
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
  updateVolunteerLocation,
  submitConditionReport,
  confirmReceipt,
};
