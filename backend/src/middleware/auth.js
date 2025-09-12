// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Auth Middleware
const authenticateToken = async (req, res, next) => {
  try {
    // 1. Token aus Header holen
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) // Remove "Bearer " prefix
      : req.headers['x-auth-token']; // Alternative header

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // 2. Token verifizieren
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. User aus Database holen
    const user = await User.findById(decoded.userId)
      .select('-__v'); // Exclude version field
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // 4. User zu Request hinzufügen
    req.user = user;
    req.userId = user._id.toString();
    
    next();

  } catch (error) {
    // JWT Token Errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Other errors
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error in authentication.',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional: Admin only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Optional: Onboarding completed check
const requireOnboarding = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.onboardingCompleted) {
    return res.status(403).json({ 
      error: 'Onboarding must be completed first',
      code: 'ONBOARDING_REQUIRED'
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOnboarding
};