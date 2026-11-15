
const express = require("express");
const router = express.Router();

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const authMiddleware = require("../middleware/authMiddleware");

// 1. Create Comment API
router.post("/:postId", authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                message: "Comment text is required"
            });
        }

        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        const newComment = new Comment({
            post: req.params.postId,
            user: req.user.id,
            text
        });

        await newComment.save();

        res.status(201).json({
            message: "Comment added successfully",
            comment: newComment
        });

    } catch (error) {
        res.status(500).json({
            message: "Comment creation failed",
            error: error.message
        });
    }
});

// 2. Get Comments API
router.get("/:postId", async (req, res) => {
    try {
        const comments = await Comment.find({
            post: req.params.postId
        })
        .populate("user", "name email")
        .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Comments fetched successfully",
            comments: comments
        });

    } catch (error) {
        res.status(500).json({
            message: "Fetching comments failed",
            error: error.message
        });
    }
});

// 3. Update Comment API
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                message: "Comment text is required"
            });
        }

        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (comment.user.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You can only update your own comments"
            });
        }

        comment.text = text;
        await comment.save();

        res.status(200).json({
            message: "Comment updated successfully",
            comment: comment
        });

    } catch (error) {
        res.status(500).json({
            message: "Comment update failed",
            error: error.message
        });
    }
});

// 4. Delete Comment API
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (comment.user.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You can only delete your own comments"
            });
        }

        await Comment.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Comment deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Comment deletion failed",
            error: error.message
        });
    }
});



module.exports = router;
