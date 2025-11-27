const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');

const router = express.Router();

// @route   GET /api/auth/check-setup
// @desc    Check if initial setup is complete
// @access  Public
router.get('/check-setup', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({ isSetupComplete: userCount > 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/setup
// @desc    Initial setup - Create first admin account
// @access  Public (only works if no users exist)
router.post('/setup', async (req, res) => {
  try {
    // Check if setup is already complete
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(400).json({ message: 'Setup already completed. Please login.' });
    }

    const { businessName, businessType, name, email, password } = req.body;

    // Validation
    if (!businessName || !name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user with business info
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      businessName,
      businessType,
      role: 'admin',
      isSetupComplete: true
    });

    // Initialize site settings with business info
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        businessName,
        businessType,
        metaTitle: businessName,
        businessDescription: `${businessName} - Event Management & Booking System`,
        isInitialized: true
      });
    } else if (!settings.isInitialized) {
      settings.businessName = businessName;
      settings.businessType = businessType;
      settings.metaTitle = businessName;
      settings.businessDescription = `${businessName} - Event Management & Booking System`;
      settings.isInitialized = true;
      await settings.save();
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Setup completed successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        businessType: user.businessType
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function for input validation and sanitization
const validateAndSanitize = (data) => {
  const sanitized = {};
  
  if (data.name) {
    sanitized.name = data.name.trim().substring(0, 100);
  }
  
  if (data.email) {
    sanitized.email = data.email.trim().toLowerCase().substring(0, 100);
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized.email)) {
      throw new Error('Invalid email format');
    }
  }
  
  if (data.password) {
    // Check password strength
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    sanitized.password = data.password;
  }
  
  return sanitized;
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    // Validate and sanitize input
    const { name, email, password } = validateAndSanitize(req.body);

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // Generate JWT with expiry from env
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    const message = error.message || 'Server error during registration';
    res.status(error.message && error.message.includes('email') ? 400 : 500).json({ message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    // Validate and sanitize input
    const { email, password } = validateAndSanitize(req.body);

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT with expiry from env
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    const message = error.message || 'Server error during login';
    res.status(error.message && error.message.includes('email') ? 400 : 500).json({ message });
  }
});

module.exports = router;
