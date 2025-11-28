const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookingVenue',
    required: true
  },
  tableNumber: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    name: String,
    startTime: String,
    endTime: String
  },
  // Guest information
  guestName: {
    type: String,
    required: true
  },
  guestEmail: {
    type: String,
    required: true
  },
  guestPhone: {
    type: String,
    required: true
  },
  numberOfGuests: {
    type: Number,
    required: true,
    default: 1
  },
  specialRequests: {
    type: String,
    default: ''
  },
  // Booking status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  // Admin notes
  adminNotes: {
    type: String,
    default: ''
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
BookingSchema.index({ venue: 1, date: 1, tableNumber: 1 });
BookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', BookingSchema);
