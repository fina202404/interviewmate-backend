const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    // req.user is populated by protect middleware which should include _id
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching profile' });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;

      // Check if email is being changed and if it's already taken
      if (req.body.email && req.body.email.toLowerCase() !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email.toLowerCase() });
        // If email exists and it's not the current user's email
        if (emailExists && emailExists._id.toString() !== user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Email already in use by another account.' });
        }
        user.email = req.body.email.toLowerCase();
      }
      
      // Password changes should be handled via a dedicated "change password" endpoint
      // that requires current password for security.

      const updatedUser = await user.save();
      res.json({ // Send back the updated user profile, excluding password
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt // Send createdAt for consistency if frontend uses it
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.code === 11000) { // Duplicate key error
        let field = Object.keys(error.keyPattern)[0];
        field = field.charAt(0).toUpperCase() + field.slice(1);
        return res.status(400).json({ success: false, message: `${field} already exists.` });
    }
    res.status(500).json({ success: false, message: 'Server Error updating profile' });
  }
});

module.exports = router;