/**
 * Database Reset Script
 * WARNING: This will DELETE ALL DATA from your database
 * Use this only for testing the setup wizard
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Poll = require('../models/Poll');
const BookingVenue = require('../models/BookingVenue');
const Booking = require('../models/Booking');

const resetDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n⚠️  WARNING: This will delete ALL data from your database!');
    console.log('⏳ Starting database reset in 3 seconds...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all collections
    console.log('\n🗑️  Deleting all users...');
    await User.deleteMany({});
    console.log('✅ Users deleted');

    console.log('🗑️  Deleting all polls...');
    await Poll.deleteMany({});
    console.log('✅ Polls deleted');

    console.log('🗑️  Deleting all booking venues...');
    await BookingVenue.deleteMany({});
    console.log('✅ Booking venues deleted');

    console.log('🗑️  Deleting all bookings...');
    await Booking.deleteMany({});
    console.log('✅ Bookings deleted');

    console.log('\n✨ Database reset complete!');
    console.log('👉 You can now visit /setup to create a new admin account\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();
