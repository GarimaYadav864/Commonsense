const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const DisputeEvent = require("../models/DisputeEvent");
const { createNotification, notifyAdmins } = require("../services/notificationService");

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const recordDisputeEvent = async ({ delivery, actor, actorRole, eventType, status, message = "", decision = null }) => {
  return DisputeEvent.create({ delivery, actor, actorRole, eventType, status, message, decision });
};
const populated = (query) => query
  .populate("request", "title category quantity unit")
  .populate("provider", "name")
  .populate("requester", "name");

const openDamageDispute = async (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    if (!["damaged", "missing"].includes(reason)) return res.status(400).json({ success: false, message: "Disputes must be for damaged or missing resources" });
    if (typeof description !== "string" || description.trim().length < 10 || description.trim().length > 1500) {
      return res.status(400).json({ success: false, message: "Please provide a description between 10 and 1500 characters" });
    }

    const delivery = await Delivery.findOneAndUpdate({
      _id: req.params.id,
      requester: req.user._id,
      status: { $in: ["dispatched", "in_transit", "delivered", "received"] },
      damageDispute: null,
      "receiptConditionReport.condition": reason,
    }, {
      $set: {
        damageDispute: {
          status: "open", reason, description: description.trim(),
          openedBy: req.user._id, openedAt: new Date(),
        },
      },
    }, { new: true, runValidators: true });

    if (!delivery) return res.status(409).json({ success: false, message: "A dispute can only be opened once for a delivery when its saved arrival report is damaged or missing." });

    await recordDisputeEvent({ delivery: delivery._id, actor: req.user._id, actorRole: "requester", eventType: "dispute_opened", status: "open", message: description.trim() });
    await recordDisputeEvent({ delivery: delivery._id, actor: req.user._id, actorRole: "provider", eventType: "provider_responded", status: "provider_responded", message: message.trim() });
    const io = req.app.get("io");
    await Promise.allSettled([
      createNotification({ io, recipient: delivery.provider, type: "damage_dispute_opened", title: "A delivery dispute was opened", message: "The requester reported a damaged or missing resource. Please review and respond.", relatedId: delivery._id, relatedModel: "Delivery" }),
      notifyAdmins(io, { type: "damage_dispute_opened", title: "New delivery dispute", message: "A requester opened a damage or missing-item dispute for a delivery.", relatedId: delivery._id, relatedModel: "Delivery" }),
    ]);
    return res.status(201).json({ success: true, message: "Dispute submitted for review.", delivery });
  } catch (error) {
    console.error("Open damage dispute error:", error);
    return res.status(500).json({ success: false, message: "Unable to open dispute" });
  }
};

const respondToDamageDispute = async (req, res) => {
  try {
    const { message } = req.body;
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    if (typeof message !== "string" || message.trim().length < 10 || message.trim().length > 1500) {
      return res.status(400).json({ success: false, message: "Please provide a response between 10 and 1500 characters" });
    }
    const delivery = await Delivery.findOneAndUpdate({
      _id: req.params.id, provider: req.user._id,
      "damageDispute.status": "open",
    }, {
      $set: {
        "damageDispute.status": "provider_responded",
        "damageDispute.providerResponse.message": message.trim(),
        "damageDispute.providerResponse.respondedAt": new Date(),
      },
    }, { new: true, runValidators: true });
    if (!delivery) return res.status(409).json({ success: false, message: "No open dispute is available for your response." });
    const io = req.app.get("io");
    await Promise.allSettled([
      createNotification({ io, recipient: delivery.requester, type: "damage_dispute_updated", title: "Provider responded to your dispute", message: "The provider has submitted a response. An admin will review the case.", relatedId: delivery._id, relatedModel: "Delivery" }),
      notifyAdmins(io, { type: "damage_dispute_updated", title: "Dispute response received", message: "A provider has responded to a delivery dispute.", relatedId: delivery._id, relatedModel: "Delivery" }),
    ]);
    return res.status(200).json({ success: true, message: "Your response was submitted.", delivery });
  } catch (error) {
    console.error("Respond to damage dispute error:", error);
    return res.status(500).json({ success: false, message: "Unable to submit dispute response" });
  }
};

const getDamageDisputes = async (req, res) => {
  try {
    const filter = req.query.status && ["open", "provider_responded", "resolved", "rejected"].includes(req.query.status)
      ? { "damageDispute.status": req.query.status }
      : { damageDispute: { $ne: null } };
    const deliveries = await populated(Delivery.find(filter).sort({ "damageDispute.openedAt": -1 }));
    return res.status(200).json({ success: true, count: deliveries.length, disputes: deliveries });
  } catch (error) {
    console.error("Get damage disputes error:", error);
    return res.status(500).json({ success: false, message: "Unable to load disputes" });
  }
};

const resolveDamageDispute = async (req, res) => {
  try {
    const { decision, notes } = req.body;
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    if (!["replacement", "partial_resolution", "no_action", "other"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Select a valid resolution decision" });
    }
    if (typeof notes !== "string" || notes.trim().length < 5 || notes.trim().length > 1500) {
      return res.status(400).json({ success: false, message: "Resolution notes must be between 5 and 1500 characters" });
    }
    const delivery = await Delivery.findOneAndUpdate({
      _id: req.params.id,
      "damageDispute.status": { $in: ["open", "provider_responded"] },
    }, {
      $set: {
        "damageDispute.status": decision === "no_action" ? "rejected" : "resolved",
        "damageDispute.resolution.decision": decision,
        "damageDispute.resolution.notes": notes.trim(),
        "damageDispute.resolution.resolvedBy": req.user._id,
        "damageDispute.resolution.resolvedAt": new Date(),
      },
    }, { new: true, runValidators: true });
    if (!delivery) return res.status(409).json({ success: false, message: "This dispute is already resolved or does not exist." });
    await recordDisputeEvent({ delivery: delivery._id, actor: req.user._id, actorRole: "admin", eventType: decision === "no_action" ? "dispute_rejected" : "dispute_resolved", status: decision === "no_action" ? "rejected" : "resolved", message: notes.trim(), decision });
    const io = req.app.get("io");
    const notice = { type: "damage_dispute_updated", title: "Delivery dispute resolved", message: "An admin has recorded a resolution for your delivery dispute.", relatedId: delivery._id, relatedModel: "Delivery" };
    await Promise.allSettled([
      createNotification({ io, recipient: delivery.requester, ...notice }),
      createNotification({ io, recipient: delivery.provider, ...notice }),
    ]);
    const result = await populated(Delivery.findById(delivery._id));
    return res.status(200).json({ success: true, message: "Dispute resolution recorded.", delivery: result });
  } catch (error) {
    console.error("Resolve damage dispute error:", error);
    return res.status(500).json({ success: false, message: "Unable to resolve dispute" });
  }
};


const getDisputeHistory = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    const delivery = await Delivery.findById(req.params.id).select("requester provider");
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    const isParty = [delivery.requester.toString(), delivery.provider.toString()].includes(req.user._id.toString());
    if (!isParty && req.user.role !== "admin") return res.status(403).json({ success: false, message: "You are not allowed to view this dispute history" });
    const events = await DisputeEvent.find({ delivery: delivery._id }).populate("actor", "name role").sort({ createdAt: 1 });
    return res.status(200).json({ success: true, events });
  } catch (error) {
    console.error("Get dispute history error:", error);
    return res.status(500).json({ success: false, message: "Unable to load dispute history" });
  }
};

module.exports = { openDamageDispute, respondToDamageDispute, getDamageDisputes, resolveDamageDispute, getDisputeHistory };
