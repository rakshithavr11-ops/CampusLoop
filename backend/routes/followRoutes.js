
const express = require("express");
const router = express.Router();

const Follow = require("../models/Follow");
const User = require("../models/User");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

// 1. Follow User API
router.post("/:userId", authMiddleware, async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.userId);

        if (!userToFollow) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (req.user.id === req.params.userId) {
            return res.status(400).json({
                message: "You cannot follow yourself"
            });
        }

        const existingFollow = await Follow.findOne({
            follower: req.user.id,
            following: req.params.userId
        });

        if (existingFollow) {
            return res.status(400).json({
                message: "You are already following this user"
            });
        }

        const newFollow = new Follow({
            follower: req.user.id,
            following: req.params.userId
        });

        await newFollow.save();

        // Create Follow Notification
        try {
            const notification = new Notification({
                recipient: req.params.userId,
                sender: req.user.id,
                type: "follow",
                message: "Someone started following you"
            });

            await notification.save();

        } catch (notificationError) {
            console.log("Notification Error:", notificationError.message);
        }

        res.status(201).json({
            message: "User followed successfully",
            follow: newFollow
        });

    } catch (error) {
        res.status(500).json({
            message: "Follow failed",
            error: error.message
        });
    }
});

// 2. Unfollow User API
router.delete("/:userId", authMiddleware, async (req, res) => {
    try {
        const follow = await Follow.findOne({
            follower: req.user.id,
            following: req.params.userId
        });

        if (!follow) {
            return res.status(404).json({
                message: "You are not following this user"
            });
        }

        await Follow.findByIdAndDelete(follow._id);

        res.status(200).json({
            message: "User unfollowed successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Unfollow failed",
            error: error.message
        });
    }
});

// 3. Get Followers API
router.get("/followers/:userId", async (req, res) => {
    try {
        const followers = await Follow.find({
            following: req.params.userId
        }).populate("follower", "name email");

        res.status(200).json({
            message: "Followers fetched successfully",
            totalFollowers: followers.length,
            followers: followers
        });

    } catch (error) {
        res.status(500).json({
            message: "Fetching followers failed",
            error: error.message
        });
    }
});

// 4. Get Following API
router.get("/following/:userId", async (req, res) => {
    try {
        const following = await Follow.find({
            follower: req.params.userId
        }).populate("following", "name email");

        res.status(200).json({
            message: "Following fetched successfully",
            totalFollowing: following.length,
            following: following
        });

    } catch (error) {
        res.status(500).json({
            message: "Fetching following failed",
            error: error.message
        });
    }
});

module.exports = router;
