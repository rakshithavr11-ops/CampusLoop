
const express = require("express");
const router = express.Router();

const ItemRequest = require("../models/ItemRequest");
const Item = require("../models/Item");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

// 1. Send a request for an item
router.post("/:itemId", authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.itemId);

        if (!item) {
            return res.status(404).json({
                message: "Item not found."
            });
        }

        if (item.status !== "Available") {
            return res.status(400).json({
                message: "This item is not available."
            });
        }

        if (item.owner.toString() === req.user.id) {
            return res.status(400).json({
                message: "You cannot request your own item."
            });
        }

        const existingRequest = await ItemRequest.findOne({
            item: item._id,
            requester: req.user.id,
            status: "Pending"
        });

        if (existingRequest) {
            return res.status(400).json({
                message: "You have already requested this item."
            });
        }

        const newRequest = new ItemRequest({
            item: item._id,
            requester: req.user.id,
            owner: item.owner,
            message: req.body.message || ""
        });

        await newRequest.save();

        // Notify the item owner
        await Notification.create({
            recipient: item.owner,
            sender: req.user.id,
            type: "item_request",
            message: `Someone has requested your item: ${item.itemName || "an item"}.`,
            item: item._id,
            itemRequest: newRequest._id
        });

        await newRequest.populate("item");
        await newRequest.populate("requester", "name email");
        await newRequest.populate("owner", "name email");

        res.status(201).json({
            message: "Item request sent successfully!",
            request: newRequest
        });

    } catch (error) {
        res.status(500).json({
            message: "Could not send item request.",
            error: error.message
        });
    }
});

// 2. View requests received by me
router.get("/received", authMiddleware, async (req, res) => {
    try {
        const requests = await ItemRequest.find({
            owner: req.user.id
        })
            .populate("item")
            .populate("requester", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            totalRequests: requests.length,
            requests
        });

    } catch (error) {
        res.status(500).json({
            message: "Could not fetch received requests.",
            error: error.message
        });
    }
});

// 3. View requests sent by me
router.get("/sent", authMiddleware, async (req, res) => {
    try {
        const requests = await ItemRequest.find({
            requester: req.user.id
        })
            .populate("item")
            .populate("owner", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            totalRequests: requests.length,
            requests
        });

    } catch (error) {
        res.status(500).json({
            message: "Could not fetch sent requests.",
            error: error.message
        });
    }
});

// 4. Accept or reject a request
router.put("/:requestId/status", authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;

        if (!["Accepted", "Rejected"].includes(status)) {
            return res.status(400).json({
                message: "Status must be Accepted or Rejected."
            });
        }

        const request = await ItemRequest.findById(req.params.requestId);

        if (!request) {
            return res.status(404).json({
                message: "Request not found."
            });
        }

        if (request.owner.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You can manage only requests for your own items."
            });
        }

        if (request.status !== "Pending") {
            return res.status(400).json({
                message: "This request has already been processed."
            });
        }

        request.status = status;
        await request.save();

        const item = await Item.findById(request.item);

        const itemName = item
            ? (item.itemName || "your requested item")
            : "your requested item";

        // Notify the requester about the decision
        await Notification.create({
            recipient: request.requester,
            sender: req.user.id,
            type: status === "Accepted"
                ? "request_accepted"
                : "request_rejected",
            message: status === "Accepted"
                ? `Your request for ${itemName} has been accepted!`
                : `Your request for ${itemName} has been rejected.`,
            item: request.item,
            itemRequest: request._id
        });

        if (status === "Accepted") {
            await Item.findByIdAndUpdate(request.item, {
                status: "Unavailable"
            });

            // Reject other pending requests and notify those requesters
            const otherRequests = await ItemRequest.find({
                item: request.item,
                _id: { $ne: request._id },
                status: "Pending"
            });

            for (const otherRequest of otherRequests) {
                otherRequest.status = "Rejected";
                await otherRequest.save();

                await Notification.create({
                    recipient: otherRequest.requester,
                    sender: req.user.id,
                    type: "request_rejected",
                    message: `Your request for ${itemName} has been rejected because another request was accepted.`,
                    item: request.item,
                    itemRequest: otherRequest._id
                });
            }
        }

        res.status(200).json({
            message: `Request ${status.toLowerCase()} successfully.`,
            request
        });

    } catch (error) {
        res.status(500).json({
            message: "Could not update request.",
            error: error.message
        });
    }
});

// 5. Owner sets pickup location and time
router.put("/:requestId/pickup", authMiddleware, async (req, res) => {
    try {
        const { pickupLocation, pickupTime } = req.body;

        const request = await ItemRequest.findById(req.params.requestId);

        if (!request) {
            return res.status(404).json({ message: "Request not found." });
        }

        if (request.owner.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Only the item owner can set pickup details."
            });
        }

        if (request.status !== "Accepted") {
            return res.status(400).json({
                message: "Pickup details can be set only for accepted requests."
            });
        }

        if (!pickupLocation || !pickupLocation.trim() || !pickupTime ||
            Number.isNaN(Date.parse(pickupTime))) {
            return res.status(400).json({
                message: "Please provide a valid pickup location and date/time."
            });
        }

        request.pickupLocation = pickupLocation.trim();
        request.pickupTime = new Date(pickupTime);

        await request.save();

        res.status(200).json({
            message: "Pickup details saved successfully.",
            request
        });
    } catch (error) {
        res.status(500).json({
            message: "Could not save pickup details.",
            error: error.message
        });
    }
});

// 6. Requester confirms receipt of item
router.put("/:requestId/confirm", authMiddleware, async (req, res) => {
    try {
        const request = await ItemRequest.findById(req.params.requestId);

        if (!request) {
            return res.status(404).json({ message: "Request not found." });
        }

        if (request.requester.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Only the requester can confirm receipt."
            });
        }

        if (request.status !== "Accepted" ||
            !request.pickupLocation || !request.pickupTime) {
            return res.status(400).json({
                message: "Pickup details must be available before confirmation."
            });
        }

        request.status = "Completed";
        await request.save();

        res.status(200).json({
            message: "Item receipt confirmed. Request completed!",
            request
        });
    } catch (error) {
        res.status(500).json({
            message: "Could not confirm receipt.",
            error: error.message
        });
    }
});

module.exports = router;
