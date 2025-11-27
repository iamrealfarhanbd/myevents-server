const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // Business Information
  businessName: {
    type: String,
    required: true,
    default: 'EventPro'
  },
  businessType: {
    type: String,
    enum: ['restaurant', 'hotel', 'cafe', 'bar', 'venue', 'other'],
    default: 'venue'
  },
  businessDescription: {
    type: String,
    default: 'Complete Event Management & Table Booking Platform'
  },
  contactEmail: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },

  // Branding
  logo: {
    type: String,
    default: '' // URL to logo image
  },
  favicon: {
    type: String,
    default: '' // URL to favicon
  },

  // Color Theme
  primaryColor: {
    type: String,
    default: '#7c3aed' // Purple
  },
  secondaryColor: {
    type: String,
    default: '#3b82f6' // Blue
  },
  accentColor: {
    type: String,
    default: '#ec4899' // Pink
  },
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  textColor: {
    type: String,
    default: '#1f2937'
  },

  // Typography
  fontFamily: {
    type: String,
    default: 'Inter, system-ui, sans-serif'
  },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },

  // Layout
  borderRadius: {
    type: String,
    enum: ['none', 'small', 'medium', 'large'],
    default: 'medium'
  },

  // Features Toggle
  enablePolls: {
    type: Boolean,
    default: true
  },
  enableBookings: {
    type: Boolean,
    default: true
  },
  enableEvents: {
    type: Boolean,
    default: true
  },

  // SEO
  metaTitle: {
    type: String,
    default: ''
  },
  metaDescription: {
    type: String,
    default: ''
  },
  metaKeywords: {
    type: String,
    default: ''
  },

  // Social Media
  facebook: {
    type: String,
    default: ''
  },
  instagram: {
    type: String,
    default: ''
  },
  twitter: {
    type: String,
    default: ''
  },
  linkedin: {
    type: String,
    default: ''
  },

  // System
  isInitialized: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SettingsSchema.statics.getSiteSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema);
