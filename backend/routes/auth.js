const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper: JWT
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not set');
  }
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { username, email, password, preferredLanguage, theme } = req.body;

      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email or username already exists',
        });
      }

      const user = await User.create({
        username,             // change to 'name' if your schema uses that field
        email,
        password,
        preferredLanguage: preferredLanguage || 'en',
        theme: theme || 'light',
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          preferredLanguage: user.preferredLanguage,
          theme: user.theme,
        },
      });
    } catch (error) {
      console.error('Registration Error:', error);

      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Email or username already exists' });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: Object.values(error.errors).map(e => e.message).join(', ')
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Server error during registration'
      });
    }
  }
);


// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').exists().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        // generic to avoid user enumeration
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        // your requested message for wrong password
        return res.status(401).json({
          success: false,
          message: 'Wrong Credential, Please try again',
        });
      }

      // update lastLogin without triggering pre-save hooks
      await User.findByIdAndUpdate(user._id, { lastLogin: Date.now() }, { new: false });

      const token = generateToken(user._id);

      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          preferredLanguage: user.preferredLanguage,
          theme: user.theme,
        },
      });
    } catch (error) {
      console.error('Login Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error during login',
      });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        preferredLanguage: user.preferredLanguage,
        theme: user.theme,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Get User Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// PUT /api/auth/settings
router.put('/settings', protect, async (req, res) => {
  try {
    const { preferredLanguage, theme, username } = req.body;
    const updateData = {};
    if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;
    if (theme) updateData.theme = theme;
    if (username) updateData.username = username;

    const user = await User.findByIdAndUpdate(req.user.id || req.user._id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        preferredLanguage: user.preferredLanguage,
        theme: user.theme,
      },
    });
  } catch (error) {
    console.error('Update Settings Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating settings',
    });
  }
});

// PUT /api/auth/password
router.put(
  '/password',
  protect,
  [
    body('currentPassword').exists().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.id || req.user._id).select('+password');
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      user.password = newPassword;
      await user.save();

      return res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      console.error('Update Password Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error updating password',
      });
    }
  }
);

module.exports = router;
