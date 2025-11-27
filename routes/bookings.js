// 🆕 NEW FILE - BOOKING SYSTEM
// This file can be deleted if booking system is not needed

const express = require('express');
const Booking = require('../models/Booking');
const BookingVenue = require('../models/BookingVenue');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/bookings/venue/:venueId
// @desc    Get all bookings for a specific venue
// @access  Protected
router.get('/venue/:venueId', protect, async (req, res) => {
  try {
    // First check if venue exists and belongs to user
    const venue = await BookingVenue.findById(req.params.venueId);
    
    if (!venue) {
      return res.status(404).json({ 
        success: false,
        message: 'Venue not found' 
      });
    }

    // Check if user owns the venue
    if (venue.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to view bookings for this venue' 
      });
    }

    // Get all bookings for this venue
    const bookings = await Booking.find({ venue: req.params.venueId })
      .populate('venue', 'name venueType')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching venue bookings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching bookings' 
    });
  }
});

// Apply protect middleware to admin routes
router.use('/admin', protect);

// @route   GET /api/bookings/admin/all
// @desc    Get all bookings for admin user
// @access  Protected
router.get('/admin/all', async (req, res) => {
  try {
    // Get all venues for this user
    const venues = await BookingVenue.find({ user: req.user.id });
    const venueIds = venues.map(v => v._id);

    // Get all bookings for these venues
    const bookings = await Booking.find({ venue: { $in: venueIds } })
      .populate('venue', 'name venueType')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
});

// @route   PUT /api/bookings/admin/:id/confirm
// @desc    Confirm a booking
// @access  Protected
router.put('/admin/:id/confirm', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('venue');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns the venue
    if (booking.venue.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to confirm this booking' });
    }

    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    if (req.body.adminNotes) {
      booking.adminNotes = req.body.adminNotes;
    }

    await booking.save();

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ message: 'Server error while confirming booking' });
  }
});

// @route   PUT /api/bookings/admin/:id/cancel
// @desc    Cancel a booking
// @access  Protected
router.put('/admin/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('venue');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns the venue
    if (booking.venue.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    booking.status = 'cancelled';
    if (req.body.adminNotes) {
      booking.adminNotes = req.body.adminNotes;
    }

    await booking.save();

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error while cancelling booking' });
  }
});

// @route   DELETE /api/bookings/admin/:id
// @desc    Delete a booking
// @access  Protected
router.delete('/admin/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('venue');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user owns the venue
    if (booking.venue.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this booking' });
    }

    await booking.deleteOne();

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Server error while deleting booking' });
  }
});

// PUBLIC ROUTES (No authentication required)

// @route   GET /api/bookings/public/venues
// @desc    Get all active venues for public booking menu
// @access  Public
router.get('/public/venues', async (req, res) => {
  try {
    const venues = await BookingVenue.find({ isActive: true })
      .select('name description venueType tables timeSlots')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      venues
    });
  } catch (error) {
    console.error('Error fetching public venues:', error);
    res.status(500).json({ message: 'Server error while fetching venues' });
  }
});

// @route   GET /api/bookings/public/:venueId/availability
// @desc    Check table availability for a specific date
// @access  Public
router.get('/public/:venueId/availability', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Please provide a date' });
    }

    const venue = await BookingVenue.findById(req.params.venueId);

    if (!venue || !venue.isActive) {
      return res.status(404).json({ message: 'Venue not found or inactive' });
    }

    // Get all bookings for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      venue: venue._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    });

    res.json({
      success: true,
      venue: {
        name: venue.name,
        description: venue.description,
        venueType: venue.venueType,
        tables: venue.tables,
        timeSlots: venue.timeSlots,
        layoutImage: venue.layoutImage
      },
      bookings: bookings.map(b => ({
        tableNumber: b.tableNumber,
        timeSlot: b.timeSlot,
        status: b.status
      }))
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ message: 'Server error while checking availability' });
  }
});

// @route   POST /api/bookings/public/:venueId/book
// @desc    Create a new booking (public)
// @access  Public
router.post('/public/:venueId/book', async (req, res) => {
  try {
    const { tableNumber, date, timeSlot, guestName, guestEmail, guestPhone, numberOfGuests, specialRequests } = req.body;

    // Validation
    if (!tableNumber || !date || !timeSlot || !guestName || !guestEmail || !guestPhone) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const venue = await BookingVenue.findById(req.params.venueId);

    if (!venue || !venue.isActive) {
      return res.status(404).json({ message: 'Venue not found or inactive' });
    }

    // Check if table is already booked for this time slot
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBooking = await Booking.findOne({
      venue: venue._id,
      tableNumber,
      date: { $gte: startOfDay, $lte: endOfDay },
      'timeSlot.startTime': timeSlot.startTime,
      'timeSlot.endTime': timeSlot.endTime,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      return res.status(400).json({ message: 'This table is already booked for the selected time slot' });
    }

    // Create booking
    const booking = await Booking.create({
      venue: venue._id,
      tableNumber,
      date,
      timeSlot,
      guestName,
      guestEmail,
      guestPhone,
      numberOfGuests: numberOfGuests || 1,
      specialRequests: specialRequests || '',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      booking,
      message: 'Booking created successfully! The admin will confirm your booking shortly.'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error while creating booking' });
  }
});

module.exports = router;
