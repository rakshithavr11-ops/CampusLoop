
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

console.log("Auth routes loaded successfully");

// Gmail email transporter
const emailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// Test API
router.get("/test", (req, res) => {
    res.send("Auth routes are working!");
});

// Registration API
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully"
        });
    } catch (error) {
        console.log("Registration Error:", error.message);

        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// Login API
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid password"
            });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.log("Login Error:", error.message);

        res.status(500).json({
            message: "Login failed"
        });
    }
});

// Forgot Password API
router.post("/forgot-password", async (req, res) => {
    let user;

    try {
        const email = req.body.email?.trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const genericMessage =
            "If an account exists for this email, a reset link will be sent.";

        user = await User.findOne({ email });
        console.log("Forgot password account found:", !!user);

        // Do not reveal whether the email is registered.
        if (!user) {
            return res.status(200).json({
                message: genericMessage
            });
        }

        // Generate a secure, random reset token.
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Store only the hash of the token in MongoDB.
        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Reset token expires after 15 minutes.
        user.resetPasswordExpires = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        const resetUrl =
            `http://localhost:5174/reset-password?token=${resetToken}`;

        try {
            console.log("Attempting to send password reset email to:", user.email);
            await emailTransporter.sendMail({
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: user.email,
                subject: "CampusLoop Password Reset",
                text:
                    "You requested a password reset for CampusLoop.\n\n" +
                    "Open this link within 15 minutes to reset your password:\n\n" +
                    resetUrl +
                    "\n\nIf you did not request this, ignore this email."
            });
        } catch (emailError) {
            // Invalidate the token if sending the email fails.
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            console.error(
                "Password reset email failed:",
                emailError.message
            );

            return res.status(500).json({
                message: "Unable to send reset email. Check the email configuration."
            });
        }
console.log("Password reset email sent successfully.");
        return res.status(200).json({
            message: genericMessage
        });
    } catch (error) {
        console.error("Forgot Password Error:", error.message);

        // Clear the token if an error occurs after it was saved.
        if (user) {
            try {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                await user.save();
            } catch (cleanupError) {
                console.error(
                    "Reset token cleanup failed:",
                    cleanupError.message
                );
            }
        }

        return res.status(500).json({
            message: "Password reset request failed"
        });
    }
});

// Reset Password API
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                message: "Reset token and new password are required"
            });
        }

        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters"
            });
        }

        // Hash the token received from the reset link.
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find a matching token that has not expired.
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Reset link is invalid or has expired. Request a new one."
            });
        }

        // Hash and save the new password.
        user.password = await bcrypt.hash(password, 10);

        // Make the reset token unusable after successful reset.
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return res.status(200).json({
            message: "Password reset successful. You can now log in."
        });
    } catch (error) {
        console.error("Reset Password Error:", error.message);

        return res.status(500).json({
            message: "Password reset failed"
        });
    }
});

// Get Profile API
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password -resetPasswordToken -resetPasswordExpires");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile fetched successfully",
            user: user
        });
    } catch (error) {
        res.status(500).json({
            message: "Profile fetching failed"
        });
    }
});

// Update Profile API
router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name && !email) {
            return res.status(400).json({
                message: "Provide name or email to update"
            });
        }

        const updates = {};

        if (name) {
            updates.name = name;
        }

        if (email) {
            updates.email = email.trim().toLowerCase();

            const existingUser = await User.findOne({
                email: updates.email,
                _id: { $ne: req.user.id }
            });

            if (existingUser) {
                return res.status(400).json({
                    message: "Email already registered"
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password -resetPasswordToken -resetPasswordExpires");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile updated successfully",
            user: user
        });
    } catch (error) {
        console.log("Profile Update Error:", error.message);

        res.status(500).json({
            message: "Profile update failed"
        });
    }
});

// Delete Account API
router.delete("/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Account deleted successfully"
        });
    } catch (error) {
        console.log("Delete Account Error:", error.message);

        res.status(500).json({
            message: "Account deletion failed"
        });
    }
});

// Search Users API
router.get("/search", async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                message: "Please enter a search term"
            });
        }

        const users = await User.find({
            $or: [
                { name: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } }
            ]
        }).select("-password -resetPasswordToken -resetPasswordExpires");

        res.status(200).json({
            message: "Users fetched successfully",
            users: users
        });
    } catch (error) {
        res.status(500).json({
            message: "User search failed"
        });
    }
});

// View Another User Profile API
router.get("/user/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -resetPasswordToken -resetPasswordExpires");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "User profile fetched successfully",
            user: user
        });
    } catch (error) {
        res.status(500).json({
            message: "Profile fetching failed"
        });
    }
});

module.exports = router;
