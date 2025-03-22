const express = require("express");
const router = express.Router();
const Leaderboard = require("../models/Leaderboard");

// Save score
router.post("/leaderboard", async (req, res) => {
  const { username, score } = req.body;
  try {
    const entry = new Leaderboard({ username, score });
    await entry.save();
    res.status(201).json({ message: "Score saved!" });
  } catch (err) {
    res.status(500).json({ message: "Error saving score" });
  }
});

// Get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const data = await Leaderboard.find().sort({ score: -1 }).limit(10);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching leaderboard" });
  }
});

module.exports = router;
