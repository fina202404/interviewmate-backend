const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');

// All routes in this file are protected and require admin authorization first
router.use(protect, authorize('admin'));

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users.map(user => ({ // Ensure consistent output format
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
    })));
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Create a new user (by Admin)
// @route   POST /api/admin/users
// @access  Private/Admin
router.post('/users', async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        if (!username || !email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Please provide username, email, password, and role.' });
        }
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role specified.' });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists with this email.' });
        }
        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ success: false, message: 'Username is already taken.' });
        }

        const newUser = new User({ username, email, password, role });
        await newUser.save();
        
        // Respond with the created user (excluding password)
        res.status(201).json({
            success: true,
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt
            },
            message: 'User created successfully.'
        });

    } catch (error) {
        console.error('Admin create user error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) {
             let field = Object.keys(error.keyPattern)[0];
             field = field.charAt(0).toUpperCase() + field.slice(1);
            return res.status(400).json({ success: false, message: `${field} already exists.` });
        }
        res.status(500).json({ success: false, message: 'Server Error creating user.' });
    }
});


// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) {
            res.json({ // Ensure consistent output format
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Admin get user by ID error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid user ID format' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});


// @desc    Update user (e.g., change role, email by admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
router.put('/users/:id', async (req, res) => {
  try {
    const userToUpdate = await User.findById(req.params.id);

    if (userToUpdate) {
      userToUpdate.username = req.body.username || userToUpdate.username;
      userToUpdate.email = req.body.email || userToUpdate.email;
      
      // Role update logic
      if (req.body.role && req.body.role !== userToUpdate.role) {
        // Prevent admin from changing their own role if they are the only admin
        if (req.user._id.equals(userToUpdate._id) && userToUpdate.role === 'admin' && req.body.role !== 'admin') {
          const adminCount = await User.countDocuments({ role: 'admin' });
          if (adminCount <= 1) {
              return res.status(400).json({ success: false, message: 'Cannot remove the role from the last admin.' });
          }
        }
        userToUpdate.role = req.body.role;
      }
      // Note: Password should generally not be updated directly here by an admin.
      // If a password reset is needed, the admin could trigger a reset flow or provide a temp password.

      const updatedUser = await userToUpdate.save();
      res.json({ // Ensure consistent output format
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Admin update user error:', error);
     if (error.code === 11000) { // Duplicate key
        let field = Object.keys(error.keyPattern)[0];
        field = field.charAt(0).toUpperCase() + field.slice(1);
        return res.status(400).json({ success: false, message: `${field} already in use.` });
    }
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    res.status(500).json({ success: false, message: 'Server Error updating user' });
  }
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);

    if (userToDelete) {
      if (userToDelete._id.equals(req.user._id)) { // Admin cannot delete themselves
        return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
      }
      // Optional: Prevent deleting the last admin account
      if (userToDelete.role === 'admin') {
          const adminCount = await User.countDocuments({ role: 'admin' });
          if (adminCount <=1) {
              return res.status(400).json({ success: false, message: 'Cannot delete the last admin account.'});
          }
      }

      await User.deleteOne({ _id: userToDelete._id });
      res.json({ success: true, message: 'User removed successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Admin delete user error:', error);
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    res.status(500).json({ success: false, message: 'Server Error deleting user' });
  }
});

module.exports = router;
