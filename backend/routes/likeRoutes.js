
const express = require("express");
const router = express.Router();

const Like = require("../models/Like");
const Post = require("../models/Post");
const authMiddleware = require("../middleware/authMiddleware");

// 1. Like Post API
router.post("/:postId", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        const existingLike = await Like.findOne({
            post: req.params.postId,
            user: req.user.id
        });

        if (existingLike) {
            return res.status(400).json({
                message: "You have already liked this post"
            });
        }

        const newLike = new Like({
            post: req.params.postId,
            user: req.user.id
        });

        await newLike.save();

        res.status(201).json({
            message: "Post liked successfully",
            like: newLike
        });

    } catch (error) {
        res.status(500).json({
            message: "Like failed",
            error: error.message
        });
    }
});

// 2. Unlike Post API
router.delete("/:postId", authMiddleware, async (req, res) => {
    try {
        const like = await Like.findOne({
            post: req.params.postId,
            user: req.user.id
        });

        if (!like) {
            return res.status(404).json({
                message: "Like not found"
            });
        }

        await Like.findByIdAndDelete(like._id);

        res.status(200).json({
            message: "Post unliked successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Unlike failed",
            error: error.message
        });
    }
});

// 3. Get Post Likes API
router.get("/:postId", async (req, res) => {
    try {
        const likes = await Like.find({
            post: req.params.postId
        }).populate("user", "name email");

        res.status(200).json({
            message: "Likes fetched successfully",
            totalLikes: likes.length,
            likes: likes
        });

    } catch (error) {
        res.status(500).json({
            message: "Fetching likes failed",
            error: error.message
        });
    }
});


module.exports = router;
