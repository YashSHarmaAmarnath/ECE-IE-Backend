const mongoose = require("mongoose");

const Score = new mongoose.Schema({
    username: String,
    score: Number,
    category: String, // Added category field
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Score", Score);
