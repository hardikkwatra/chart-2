// controllers/chartController.js
const Score = require("../models/Score");

// GET /api/chart/user/:username
const getUserByUsername = async (req, res) => {
  const { username } = req.body;

  try {
    if (!username) return res.status(400).json({ error: "Username is required" });

    const user = await Score.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Construct simplified response (you can extend this to match frontend expectations)
    const responseData = {
      id: user._id,
      username: user.username,
      email: user.email,
      twitterScore: user.twitterScore,
      telegramScore: user.telegramScore,
      totalScore: user.totalScore,
      badges: user.badges,
      profileImageUrl: "/placeholder.svg", // You can extend logic to store image URLs later
      walletScore: user.wallets.reduce((sum, w) => sum + w.score, 0),
      isVerified: true // or derive from a field in DB if you want
    };

    return res.json(responseData);
  } catch (err) {
    console.error("[ChartController] Error fetching user:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getUserByUsername,
};
