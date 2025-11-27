// 🆕 NEW FILE - BOOKING SYSTEM
// This file can be deleted if booking system is not needed

const express = require('express');
const QRCode = require('qrcode');
const BookingVenue = require('../models/BookingVenue');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protect middleware to all routes (admin only)
router.use(protect);

// @route   POST /api/booking-venues
// @desc    Create a new booking venue
// @access  Protected
router.post('/', async (req, res) => {
  try {
    const { name, description, venueType, tables, timeSlots, layoutImage } = req.body;

    // Validation
    if (!name || !venueType) {
      return res.status(400).json({ message: 'Please provide venue name and type' });
    }

    // Create venue
    const venue = await BookingVenue.create({
      name,
      description: description || '',
      venueType,
      tables: tables || [],
      timeSlots: timeSlots || [],
      layoutImage: layoutImage || null,
      user: req.user.id
    });

    res.status(201).json({
      success: true,
      venue
    });
  } catch (error) {
    console.error('Error creating venue:', error);
    res.status(500).json({ message: 'Server error while creating venue' });
  }
});

// @route   GET /api/booking-venues
// @desc    Get all venues for logged-in user
// @access  Protected
router.get('/', async (req, res) => {
  try {
    const venues = await BookingVenue.find({ user: req.user.id }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      venues
    });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ message: 'Server error while fetching venues' });
  }
});

// @route   GET /api/booking-venues/:id
// @desc    Get single venue by ID
// @access  Protected
router.get('/:id', async (req, res) => {
  try {
    const venue = await BookingVenue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user owns this venue
    if (venue.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this venue' });
    }

    res.json({
      success: true,
      venue
    });
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ message: 'Server error while fetching venue' });
  }
});

// @route   PUT /api/booking-venues/:id
// @desc    Update a venue
// @access  Protected
router.put('/:id', async (req, res) => {
  try {
    const venue = await BookingVenue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user owns this venue
    if (venue.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this venue' });
    }

    const { name, description, venueType, tables, timeSlots, layoutImage, isActive } = req.body;

    // Update venue
    venue.name = name || venue.name;
    venue.description = description !== undefined ? description : venue.description;
    venue.venueType = venueType || venue.venueType;
    venue.tables = tables !== undefined ? tables : venue.tables;
    venue.timeSlots = timeSlots !== undefined ? timeSlots : venue.timeSlots;
    venue.layoutImage = layoutImage !== undefined ? layoutImage : venue.layoutImage;
    venue.isActive = isActive !== undefined ? isActive : venue.isActive;

    await venue.save();

    res.json({
      success: true,
      venue
    });
  } catch (error) {
    console.error('Error updating venue:', error);
    res.status(500).json({ message: 'Server error while updating venue' });
  }
});

// @route   DELETE /api/booking-venues/:id
// @desc    Delete a venue
// @access  Protected
router.delete('/:id', async (req, res) => {
  try {
    const venue = await BookingVenue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user owns this venue
    if (venue.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this venue' });
    }

    // Delete all bookings associated with this venue
    await Booking.deleteMany({ venue: venue._id });

    await venue.deleteOne();

    res.json({
      success: true,
      message: 'Venue deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting venue:', error);
    res.status(500).json({ message: 'Server error while deleting venue' });
  }
});

// @route   GET /api/booking-venues/:id/bookings
// @desc    Get all bookings for a venue
// @access  Protected
router.get('/:id/bookings', async (req, res) => {
  try {
    const venue = await BookingVenue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user owns this venue
    if (venue.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access these bookings' });
    }

    const bookings = await Booking.find({ venue: venue._id })
      .sort({ date: 1, 'timeSlot.startTime': 1 });

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
});

// @route   GET /api/booking-venues/:id/qrcode
// @desc    Generate QR code for venue booking page
// @access  Protected
router.get('/:id/qrcode', async (req, res) => {
  try {
    const venue = await BookingVenue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Generate the booking URL
    const bookingUrl = `${process.env.CLIENT_URL || 'http://localhost:5174'}/booking/${venue._id}`;
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(bookingUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      qrCode: qrCodeDataUrl,
      url: bookingUrl
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: 'Server error while generating QR code' });
  }
});

module.exports = router;
