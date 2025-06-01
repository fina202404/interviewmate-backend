const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password'); // Exclude passwords
    res.json(users.map(user => ({ // Ensure consistent fields, especially _id
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
    })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (user) {
      res.json({
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
    console.error('Get user by ID error:', error);
    res.status(500).json({ success: false, message: 'Server error or invalid ID format' });
  }
};

// @desc    Update user by ID (by admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // Prevent admin from changing their own role if they are the last admin
      if (req.user._id.equals(user._id) && user.role === 'admin' && req.body.role !== 'admin') {
          const adminCount = await User.countDocuments({ role: 'admin' });
          if (adminCount <= 1) {
              return res.status(400).json({ success: false, message: 'Cannot remove the last admin role.' });
          }
      }

      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      // Admin should not set password directly here. Password resets should use a different mechanism.
      // If password needs to be settable by admin, consider implications carefully.

      const updatedUser = await user.save();
      res.json({
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
    console.error('Update user error:', error);
     if (error.code === 11000 || error.name === 'MongoError' && error.message.includes('duplicate key')) {
         let field = Object.keys(error.keyValue)[0];
         field = field.charAt(0).toUpperCase() + field.slice(1);
         return res.status(400).json({ success: false, message: `${field} already exists.` });
     }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete user by ID
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (user.role === 'admin' && req.user._id.equals(user._id)) {
        return res.status(400).json({ success: false, message: 'Admins cannot delete themselves.' });
      }
      // Add check to prevent deleting the last admin if desired
      if (user.role === 'admin') {
          const adminCount = await User.countDocuments({ role: 'admin' });
          if (adminCount <= 1) {
              return res.status(400).json({ success: false, message: 'Cannot delete the last admin account.' });
          }
      }

      await user.deleteOne(); // Mongoose v6+
      res.json({ success: true, message: 'User removed' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};