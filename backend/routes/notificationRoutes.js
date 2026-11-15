const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

// 1. Get All Notifications API
router.get("/", authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.user.id
        })
            .populate("sender", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Notifications fetched successfully",
            totalNotifications: notifications.length,
            notifications: notifications
        });

    } catch (error) {
        res.status(500).json({
            message: "Fetching notifications failed",
            error: error.message
        });
    }
});

// 2. Mark Notification as Read API
router.put("/:id/read", authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            recipient: req.user.id
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            message: "Notification marked as read",
            notification: notification
        });

    } catch (error) {
        res.status(500).json({
            message: "Updating notification failed",
            error: error.message
        });
    }
});

// 3. Delete Notification API
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user.id
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.status(200).json({
            message: "Notification deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Deleting notification failed",
            error: error.message
        });
    }
});

module.exports = router;