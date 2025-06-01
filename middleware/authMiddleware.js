const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

// Protect routes: verify token and attach user to request
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // else if (req.cookies.token) { // Alternative: check for token in cookies
  //   token = req.cookies.token;
  // }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password'); // Attach user object to req

    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found for this token' });
    }
    next();
  } catch (error) {
    console.error('Token verification error:', error.name, error.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed or expired' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`,
      });
    }
    next();
  };
};