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

// Import required models for backup/restore
const Poll = require('../models/Poll');
const Submission = require('../models/Submission');
const BookingVenue = require('../models/BookingVenue');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/export-backup
// @desc    Export all user data as JSON backup
// @access  Protected
router.post('/export-backup', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all user data
    console.log('📦 Starting backup for user:', userId);
    const user = await User.findById(userId).select('-password');
    const settings = await Settings.findOne(); // Settings is global, not per user
    const polls = await Poll.find({ user: userId });
    const venues = await BookingVenue.find({ user: userId });
    
    // Get all bookings for user's venues
    const venueIds = venues.map(v => v._id);
    const bookings = await Booking.find({ venue: { $in: venueIds } });
    
    // Get all submissions for user's polls
    const pollIds = polls.map(p => p._id);
    const submissions = await Submission.find({ poll: { $in: pollIds } });
    
    console.log('📊 Backup data collected:');
    console.log('  ✅ Users: 1');
    console.log('  ✅ Settings:', settings ? 1 : 0);
    console.log('  ✅ Polls:', polls.length);
    console.log('  ✅ BookingVenues:', venues.length);
    console.log('  ✅ Bookings:', bookings.length);
    console.log('  ✅ Submissions:', submissions.length);

    // Create backup object
    const backup = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      user: user,
      settings: settings,
      polls: polls,
      venues: venues,
      bookings: bookings,
      submissions: submissions,
      statistics: {
        totalUsers: 1,
        totalSettings: settings ? 1 : 0,
        totalPolls: polls.length,
        totalVenues: venues.length,
        totalBookings: bookings.length,
        totalSubmissions: submissions.length
      }
    };

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: backup,
      filename: `eventpro-backup-${user.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
    });
  } catch (error) {
    console.error('Export backup error:', error);
    res.status(500).json({ message: 'Failed to create backup', error: error.message });
  }
});

// @route   POST /api/auth/import-backup
// @desc    Import data from JSON backup
// @access  Protected
router.post('/import-backup', protect, async (req, res) => {
  try {
    const { backup, replaceExisting } = req.body;
    const userId = req.user.id;

    if (!backup || !backup.version) {
      return res.status(400).json({ message: 'Invalid backup file format' });
    }

    console.log('📥 Starting import process...');

    let imported = {
      users: 0,
      settings: 0,
      polls: 0,
      venues: 0,
      bookings: 0,
      submissions: 0
    };

    // If replaceExisting, delete current data first
    if (replaceExisting) {
      await Poll.deleteMany({ user: userId });
      await BookingVenue.deleteMany({ user: userId });
      // Bookings will be deleted via cascade or manually
      const userVenues = await BookingVenue.find({ user: userId });
      const venueIds = userVenues.map(v => v._id);
      await Booking.deleteMany({ venue: { $in: venueIds } });
      
      const userPolls = await Poll.find({ user: userId });
      const pollIds = userPolls.map(p => p._id);
      await Submission.deleteMany({ poll: { $in: pollIds } });
    }

    // Import settings (global settings, not per user)
    if (backup.settings) {
      const settingsData = { ...backup.settings };
      delete settingsData._id; // Remove _id to avoid conflicts
      delete settingsData.__v; // Remove version key
      
      await Settings.findOneAndUpdate(
        {}, // Find the single settings document
        settingsData,
        { upsert: true, new: true }
      );
      imported.settings = 1;
      console.log('✅ Settings: 1');
    }

    // Import polls
    if (backup.polls && backup.polls.length > 0) {
      const pollsToImport = backup.polls.map(poll => ({
        ...poll,
        _id: undefined, // Let MongoDB create new IDs
        user: userId,
        createdAt: poll.createdAt || new Date()
      }));
      const importedPolls = await Poll.insertMany(pollsToImport);
      imported.polls = importedPolls.length;
      console.log('✅ Polls:', importedPolls.length);

      // Map old poll IDs to new poll IDs for submissions
      const pollIdMap = {};
      backup.polls.forEach((oldPoll, index) => {
        if (oldPoll._id && importedPolls[index]) {
          pollIdMap[oldPoll._id.toString()] = importedPolls[index]._id;
        }
      });

      // Import submissions with new poll IDs
      if (backup.submissions && backup.submissions.length > 0) {
        const submissionsToImport = backup.submissions
          .filter(sub => pollIdMap[sub.poll.toString()])
          .map(sub => ({
            ...sub,
            _id: undefined,
            poll: pollIdMap[sub.poll.toString()],
            submittedAt: sub.submittedAt || new Date()
          }));
        const importedSubs = await Submission.insertMany(submissionsToImport);
        imported.submissions = importedSubs.length;
        console.log('✅ Submissions:', importedSubs.length);
      }
    }

    // Import venues
    if (backup.venues && backup.venues.length > 0) {
      const venuesToImport = backup.venues.map(venue => ({
        ...venue,
        _id: undefined,
        user: userId,
        createdAt: venue.createdAt || new Date()
      }));
      const importedVenues = await BookingVenue.insertMany(venuesToImport);
      imported.venues = importedVenues.length;
      console.log('✅ BookingVenues:', importedVenues.length);

      // Map old venue IDs to new venue IDs for bookings
      const venueIdMap = {};
      backup.venues.forEach((oldVenue, index) => {
        if (oldVenue._id && importedVenues[index]) {
          venueIdMap[oldVenue._id.toString()] = importedVenues[index]._id;
        }
      });

      // Import bookings with new venue IDs
      if (backup.bookings && backup.bookings.length > 0) {
        const bookingsToImport = backup.bookings
          .filter(booking => venueIdMap[booking.venue.toString()])
          .map(booking => ({
            ...booking,
            _id: undefined,
            venue: venueIdMap[booking.venue.toString()],
            createdAt: booking.createdAt || new Date()
          }));
        const importedBookings = await Booking.insertMany(bookingsToImport);
        imported.bookings = importedBookings.length;
        console.log('✅ Bookings:', importedBookings.length);
      }
    }

    // User is already logged in (current user), so mark as imported
    imported.users = 1;
    console.log('✅ Users: 1 (current logged-in user)');
    
    console.log('🎉 Import completed successfully!');
    console.log('📊 Summary:', imported);

    res.json({
      success: true,
      message: 'Backup imported successfully',
      imported: imported
    });
  } catch (error) {
    console.error('Import backup error:', error);
    res.status(500).json({ message: 'Failed to import backup', error: error.message });
  }
});

// @route   POST /api/auth/delete-account
// @desc    Delete admin account and all associated data
// @access  Protected
router.post('/delete-account', protect, async (req, res) => {
  try {
    const { confirmPassword, confirmText } = req.body;
    const userId = req.user.id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(confirmPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Verify confirmation text
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ message: 'Please type "DELETE MY ACCOUNT" to confirm' });
    }

    console.log('🗑️ Starting COMPLETE DATABASE RESET for admin:', userId);
    console.log('⚠️ This will delete ALL data from ALL collections!');

    // Delete ALL data from ALL collections (complete database reset)
    // 1. Delete ALL submissions
    const deletedSubmissions = await Submission.deleteMany({});
    console.log('✅ Deleted', deletedSubmissions.deletedCount, 'submissions (ALL)');
    
    // 2. Delete ALL bookings
    const deletedBookings = await Booking.deleteMany({});
    console.log('✅ Deleted', deletedBookings.deletedCount, 'bookings (ALL)');
    
    // 3. Delete ALL polls
    const deletedPolls = await Poll.deleteMany({});
    console.log('✅ Deleted', deletedPolls.deletedCount, 'polls (ALL)');
    
    // 4. Delete ALL booking venues
    const deletedVenues = await BookingVenue.deleteMany({});
    console.log('✅ Deleted', deletedVenues.deletedCount, 'booking venues (ALL)');
    
    // 5. Delete ALL settings
    const deletedSettings = await Settings.deleteMany({});
    console.log('✅ Deleted', deletedSettings.deletedCount, 'settings (ALL)');
    
    // 6. Delete ALL users
    const deletedUsers = await User.deleteMany({});
    console.log('✅ Deleted', deletedUsers.deletedCount, 'users (ALL)');
    
    console.log('🎉 Complete database reset finished! All collections cleared.');

    res.json({
      success: true,
      message: 'Account and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account', error: error.message });
  }
});

module.exports = router;
