
const express = require("express");
const router = express.Router();

const Post = require("../models/Post");
const Follow = require("../models/Follow");
const authMiddleware = require("../middleware/authMiddleware");

// 1. Create Post API
router.post("/", authMiddleware, async (req, res) => {
    try {
        const newPost = new Post({
            user: req.user.id,
            title: req.body.title,
            content: req.body.content
        });

        await newPost.save();

        res.status(201).json({
            message: "Post created successfully",
            post: newPost
        });

    } catch (error) {
        res.status(500).json({
            message: "Post creation failed",
            error: error.message
        });
    }
});

// 2. Get All Posts API
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Posts fetched successfully",
            posts: posts
        });

    } catch (error) {
        res.status(500).json({
            message: "Fetching posts failed",
            error: error.message
        });
    }
});

// 3. User Feed API
router.get("/feed", authMiddleware, async (req, res) => {
    try {
        const followingUsers = await Follow.find({
            follower: req.user.id
        });

        const followingIds = followingUsers.map(
            follow => follow.following
        );

        const posts = await Post.find({
            user: { $in: followingIds }
        })
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Feed fetched successfully",
            totalPosts: posts.length,
            posts: posts
        });

    } catch (error) {
        res.status(500).json({
            message: "Fetching feed failed",
            error: error.message
        });
    }
});

// 4. Get Single Post API
router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("user", "name email");

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        res.status(200).json({
            message: "Post fetched successfully",
            post: post
        });

    } catch (error) {
        res.status(500).json({
            message: "Fetching post failed",
            error: error.message
        });
    }
});

// 5. Update Post API
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        if (post.user.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You can update only your own posts"
            });
        }

        post.title = req.body.title || post.title;
        post.content = req.body.content || post.content;

        await post.save();

        res.status(200).json({
            message: "Post updated successfully",
            post: post
        });

    } catch (error) {
        res.status(500).json({
            message: "Post update failed",
            error: error.message
        });
    }
});

// 6. Delete Post API
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        if (post.user.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You can delete only your own posts"
            });
        }

        await Post.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Post deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Post deletion failed",
            error: error.message
        });
    }
});

module.exports = router;
