const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: [
            "follow",
            "like",
            "comment",
            "item_request",
            "request_accepted",
            "request_rejected"
        ],
        required: true
    },

    message: {
        type: String,
        required: true
    },

    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    },

    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item"
    },

    itemRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ItemRequest"
    },

    isRead: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Notification", notificationSchema);