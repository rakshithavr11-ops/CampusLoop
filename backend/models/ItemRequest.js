
const mongoose = require("mongoose");

const itemRequestSchema = new mongoose.Schema(
    {
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
            required: true
        },

        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        message: {
            type: String,
            default: "",
            trim: true
        },

        status: {
            type: String,
            enum: ["Pending", "Accepted", "Rejected", "Cancelled", "Completed"],
            default: "Pending"
        },

        pickupLocation: {
            type: String,
            default: "",
            trim: true
        },

        pickupTime: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ItemRequest", itemRequestSchema);
