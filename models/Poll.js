const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a poll title']
  },
  description: {
    type: String,
    default: ''
  },
  questions: [
    {
      id: {
        type: String,
        required: true
      },
      text: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['text', 'button', 'dropdown'],
        default: 'text'
      },
      options: {
        type: [String],
        default: []
      }
    }
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  consentEnabled: {
    type: Boolean,
    default: false
  },
  consentText: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expireAt: {
    type: Date,
    required: [true, 'Please add an expiry date']
  }
});

// CRITICAL: TTL Index for automatic deletion
// This tells MongoDB to delete the document immediately (0 seconds) after the expireAt date is reached
PollSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Poll', PollSchema);
