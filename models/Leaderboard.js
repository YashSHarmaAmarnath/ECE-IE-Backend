const mongoose = require("mongoose");

const LeaderboardSchema = new mongoose.Schema({
  username: String,
  score: Number,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Leaderboard", LeaderboardSchema);
