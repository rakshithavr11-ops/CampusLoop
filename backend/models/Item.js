
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        itemName: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true
        },

        category: {
            type: String,
            required: true
        },

        imageUrl: {
            type: String,
            default: ""
        },

        listingType: {
            type: String,
            enum: ["Give Away", "Exchange", "Rent"],
            required: true
        },

        rentalPrice: {
            type: Number,
            default: 0,
            min: 0
        },

        exchangePreference: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: ["Available", "Unavailable"],
            default: "Available"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Item", itemSchema);
