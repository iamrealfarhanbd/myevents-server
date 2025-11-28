const express = require('express');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/settings
// @desc    Get site settings (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getSiteSettings();
    
    // If no settings exist, return default values (don't create in DB)
    if (!settings) {
      return res.json({
        businessName: 'MyEvents',
        businessType: 'restaurant',
        businessDescription: 'Event Management & Booking System',
        primaryColor: '#7c3aed',
        secondaryColor: '#3b82f6',
        accentColor: '#ec4899',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 'medium',
        borderRadius: 'medium',
        logo: '',
        favicon: '',
        contactEmail: '',
        contactPhone: '',
        website: '',
        address: '',
        enablePolls: true,
        enableBookings: true,
        enableEvents: true,
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        metaTitle: '',
        metaDescription: '',
        isInitialized: false
      });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/settings
// @desc    Update site settings
// @access  Private (Admin only)
router.put('/', protect, async (req, res) => {
  try {
    // Check if user is admin
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      // Update fields
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          settings[key] = req.body[key];
        }
      });
    }

    settings.updatedAt = Date.now();
    await settings.save();

    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/settings/initialize
// @desc    Initialize settings with business info from setup
// @access  Private
router.post('/initialize', protect, async (req, res) => {
  try {
    const { businessName, businessType } = req.body;

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings({
        businessName,
        businessType,
        isInitialized: true,
        metaTitle: businessName,
        businessDescription: `${businessName} - Event Management & Booking System`
      });
    } else if (!settings.isInitialized) {
      settings.businessName = businessName;
      settings.businessType = businessType;
      settings.metaTitle = businessName;
      settings.businessDescription = `${businessName} - Event Management & Booking System`;
      settings.isInitialized = true;
    }

    await settings.save();

    res.json({
      message: 'Settings initialized successfully',
      settings
    });
  } catch (error) {
    console.error('Settings initialization error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
