// backend/routes/auth.js - MINIMAL VERSION
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/login - Das MUSS sein
router.post('/auth/login', async (req, res) => {
  try {
    const { email, name } = req.body;

    // User finden per Email
    let user = await User.findOne({ email: email });

    if (!user) {
      // Neuer User - Nur Email & Name
      user = new User({
        email: email,
        name: name
      });
      await user.save();
    }

    // JWT Token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        onboardingCompleted: user.onboardingCompleted,
        reviewerStatus: user.reviewerStatus,
        role: user.role || 'reviewer',  // Include role for admin check
        repPoints: user.repPoints || 0
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;