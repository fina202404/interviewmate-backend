const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // For reset password, though User model handles hashing
const crypto = require('crypto'); // For generating reset token
require('dotenv').config();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }
    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    // Create user
    // If role is provided and the creator is an admin (this logic needs to be in an admin route for creating users with specific roles)
    // For public signup, role defaults to 'user'
    const newUser = await User.create({
      username,
      email,
      password,
      role: role && req.user && req.user.role === 'admin' ? role : 'user', // Simplistic role assignment, refine if needed
    });

    if (newUser) {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        // Optionally return token and user data if immediate login is desired
        // token: generateToken(newUser._id),
        // user: { _id: newUser._id, username: newUser.username, email: newUser.email, role: newUser.role }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/signin
// @access  Public
exports.signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password'); // Explicitly request password

    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        token: generateToken(user._id),
        // Frontend will call /api/auth/me to get user details
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ success: false, message: 'Server error during signin' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  // req.user is set by the protect middleware
  if (req.user) {
    // Ensure the user object sent to frontend has _id, username, email, role, createdAt
    const userProfile = {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
    };
    res.status(200).json({ success: true, user: userProfile });
  } else {
    res.status(404).json({ success: false, message: 'User not found' }); // Should be caught by protect middleware earlier
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Send generic message to prevent email enumeration
            return res.status(200).json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate reset token (simple example, use more robust methods for production)
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save({ validateBeforeSave: false });

        // Here you would typically send an email with the resetToken
        // For this example, we'll just return success
        console.log(`Password reset token for ${email}: ${resetToken}`); // Log for testing
        res.status(200).json({ success: true, message: 'Password reset instructions sent if email is registered.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        // Ensure not to leak information if user.save fails
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({validateBeforeSave: false}).catch(err => console.error("Error clearing token on fail:", err));
        res.status(500).json({ success: false, message: 'Error processing request' });
    }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        user.password = req.body.password; // Mongoose pre-save hook will hash it
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
};