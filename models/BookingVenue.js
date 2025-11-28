const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    default: 4
  },
  // Position for visual layout (x, y coordinates in pixels or grid)
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  // Table shape for visualization
  shape: {
    type: String,
    enum: ['square', 'circle', 'rectangle'],
    default: 'square'
  }
});

const TimeSlotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  // Days of week this slot is available
  daysAvailable: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }
});

const BookingVenueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a venue name']
  },
  description: {
    type: String,
    default: ''
  },
  // Venue type: Lunch, Dinner, Breakfast, etc.
  venueType: {
    type: String,
    required: true
  },
  tables: [TableSchema],
  timeSlots: [TimeSlotSchema],
  // Layout image URL (optional)
  layoutImage: {
    type: String,
    default: null
  },
  // Enable/disable booking for this venue
  isActive: {
    type: Boolean,
    default: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BookingVenue', BookingVenueSchema);
