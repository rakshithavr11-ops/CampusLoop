
const express = require("express");
const router = express.Router();

const Item = require("../models/Item");
const authMiddleware = require("../middleware/authMiddleware");

const listingTypes = ["Give Away", "Exchange", "Rent"];

// 1. Create a new item listing
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            itemName,
            description,
            category,
            imageUrl,
            listingType,
            rentalPrice,
            exchangePreference
        } = req.body;

        if (!itemName || !description || !category || !listingType) {
            return res.status(400).json({
                message: "Please provide item name, description, category and listing type."
            });
        }

        if (!listingTypes.includes(listingType)) {
            return res.status(400).json({
                message: "Invalid listing type."
            });
        }

        if (listingType === "Rent" &&
            (!Number.isFinite(Number(rentalPrice)) || Number(rentalPrice) <= 0)) {
            return res.status(400).json({
                message: "Please enter a rental price greater than zero."
            });
        }

        if (listingType === "Exchange" && !exchangePreference?.trim()) {
            return res.status(400).json({
                message: "Please describe what you want in exchange."
            });
        }

        const newItem = new Item({
            owner: req.user.id,
            itemName: itemName.trim(),
            description: description.trim(),
            category: category.trim(),
            imageUrl: imageUrl || "",
            listingType,
            rentalPrice: listingType === "Rent" ? Number(rentalPrice) : 0,
            exchangePreference: listingType === "Exchange"
                ? exchangePreference.trim()
                : ""
        });

        await newItem.save();
        await newItem.populate("owner", "name email");

        res.status(201).json({
            message: "Item listed successfully!",
            item: newItem
        });

    } catch (error) {
        res.status(500).json({
            message: "Item creation failed.",
            error: error.message
        });
    }
});

// 2. Get all available marketplace items
router.get("/", async (req, res) => {
    try {
        const { search, category, listingType } = req.query;

        const filter = {
            status: "Available"
        };

        if (search) {
            filter.$or = [
                { itemName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        if (category) {
            filter.category = category;
        }

        if (listingType) {
            if (!listingTypes.includes(listingType)) {
                return res.status(400).json({
                    message: "Invalid listing type."
                });
            }

            filter.listingType = listingType;
        }

        const items = await Item.find(filter)
            .populate("owner", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Marketplace items fetched successfully.",
            totalItems: items.length,
            items
        });

    } catch (error) {
        res.status(500).json({
            message: "Could not fetch marketplace items.",
            error: error.message
        });
    }
});

// 3. Get my own listings
router.get("/my-listings", authMiddleware, async (req, res) => {
    try {
        const items = await Item.find({
            owner: req.user.id
        })
            .populate("owner", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Your listings fetched successfully.",
            totalItems: items.length,
            items
        });

    } catch (error) {
        res.status(500).json({
            message: "Could not fetch your listings.",
            error: error.message
        });
    }
});

// 4. Get one item by ID
router.get("/:id", async (req, res) => {
    try {
        const item = await Item.findById(req.params.id)
            .populate("owner", "name email");

        if (!item) {
            return res.status(404).json({
                message: "Item not found."
            });
        }

        res.status(200).json({
            message: "Item fetched successfully.",
            item
        });

    } catch (error) {
        res.status(400).json({
            message: "Invalid item ID or item could not be fetched.",
            error: error.message
        });
    }
});

// 5. Update my own listing

// 5. Update my own listing
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                message: "Item not found."
            });
        }

        if (item.owner.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You can update only your own listings."
            });
        }

        const {
            itemName,
            description,
            category,
            imageUrl,
            listingType,
            rentalPrice,
            exchangePreference
        } = req.body;

        if (itemName !== undefined) {
            if (!itemName.trim()) {
                return res.status(400).json({
                    message: "Item name cannot be empty."
                });
            }
            item.itemName = itemName.trim();
        }

        if (description !== undefined) {
            if (!description.trim()) {
                return res.status(400).json({
                    message: "Description cannot be empty."
                });
            }
            item.description = description.trim();
        }

        if (category !== undefined) {
            if (!category.trim()) {
                return res.status(400).json({
                    message: "Category cannot be empty."
                });
            }
            item.category = category.trim();
        }

        if (imageUrl !== undefined) {
            item.imageUrl = imageUrl;
        }

        const newListingType = listingType ?? item.listingType;

        if (!listingTypes.includes(newListingType)) {
            return res.status(400).json({
                message: "Invalid listing type."
            });
        }

        if (newListingType === "Rent") {
            const price = rentalPrice !== undefined
                ? Number(rentalPrice)
                : Number(item.rentalPrice);

            if (!Number.isFinite(price) || price <= 0) {
                return res.status(400).json({
                    message: "Please enter a rental price greater than zero."
                });
            }

            item.rentalPrice = price;
            item.exchangePreference = "";
        } else if (newListingType === "Exchange") {
            const preference = exchangePreference !== undefined
                ? exchangePreference.trim()
                : item.exchangePreference;

            if (!preference) {
                return res.status(400).json({
                    message: "Please describe what you want in exchange."
                });
            }

            item.exchangePreference = preference;
            item.rentalPrice = 0;
        } else {
            item.rentalPrice = 0;
            item.exchangePreference = "";
        }

        item.listingType = newListingType;

        await item.save();
        await item.populate("owner", "name email");

        res.status(200).json({
            message: "Item updated successfully!",
            item
        });

    } catch (error) {
        res.status(400).json({
            message: "Item update failed.",
            error: error.message
        });
    }
});


// 6. Delete my own listing
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                message: "Item not found."
            });
        }

        if (item.owner.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You can delete only your own listings."
            });
        }

        await Item.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Item deleted successfully."
        });

    } catch (error) {
        res.status(400).json({
            message: "Item deletion failed.",
            error: error.message
        });
    }
});

module.exports = router;
