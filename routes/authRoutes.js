const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ensure this path is correct
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware'); // Ensure this path is correct

// Mock sendEmail function (can be removed if not used elsewhere after this change)
const sendEmail = async (options) => {
  console.log('---- MOCK EMAIL (Not used by forgotPassword if frontend handles email) ----');
  console.log('To:', options.email);
  console.log('Subject:', options.subject);
  console.log('Message (HTML/Text):', options.message);
  console.log('--------------------');
  return Promise.resolve();
};


// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username, email, and password' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }
    user = await User.findOne({ username });
    if (user) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    user = new User({ username, email, password }); // Role defaults to 'user' as per schema
    await user.save();

    res.status(201).json({ success: true, message: 'User registered successfully. Please login.' });

  } catch (error) {
    console.error('Signup error:', error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.code === 11000) { // Duplicate key error
        let field = Object.keys(error.keyPattern)[0];
        field = field.charAt(0).toUpperCase() + field.slice(1);
        return res.status(400).json({ success: false, message: `${field} already exists.` });
    }
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/signin
// @access  Public
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password'); // Explicitly select password for comparison
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = user.getSignedJwtToken(); // Assumes User model has this method

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id, // Use _id for consistency
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ success: false, message: 'Server error during signin' });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    // req.user is set by the 'protect' middleware
    if (!req.user) {
        return res.status(404).json({ success: false, message: 'User not found (should be caught by protect middleware)' });
    }
    res.status(200).json({
        success: true,
        user: { // Ensure this structure matches frontend expectations (e.g., AuthContext, ProfilePage)
            _id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role,
            createdAt: req.user.createdAt
        }
    });
});

// @desc    Forgot password - Generates token, frontend sends email via EmailJS
// @route   POST /api/auth/forgotpassword
// @access  Public
router.post('/forgotpassword', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      // To prevent email enumeration, always return a success-like message.
      // The frontend can then decide if it attempts to send an email or just shows the message.
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, password reset instructions will be processed.'
        // No token is sent if user not found, to prevent info leakage.
      });
    }

    const resetToken = user.getResetPasswordToken(); // This method in User.js returns the unhashed token
    await user.save({ validateBeforeSave: false }); // This saves the hashed token and expiry in the DB

    // Send the unhashed (raw) token back to the frontend.
    // The frontend will use this to construct the reset URL and send the email via EmailJS.
    res.status(200).json({
      success: true,
      message: 'Password reset token generated. Frontend should now send the email.', // Or a more generic success message
      resetToken: resetToken // Provide the unhashed token for the frontend
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error processing forgot password request' });
  }
});


// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
router.put('/resetpassword/:resettoken', async (req, res) => {
  try {
    // Get hashed token from URL param (the resettoken from URL is the unhashed one)
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken, // Compare with hashed token in DB
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (!req.body.password || req.body.password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    user.password = req.body.password; // Mongoose pre-save hook will hash it
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully. Please login.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error while resetting password' });
  }
});

module.exports = router;