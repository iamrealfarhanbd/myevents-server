const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  poll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true
  },
  participantName: {
    type: String,
    required: [true, 'Please provide your name']
  },
  participantEmail: {
    type: String,
    required: [true, 'Please provide your email']
  },
  participantPhone: {
    type: String,
    default: ''
  },
  answers: [
    {
      questionId: {
        type: String,
        required: true
      },
      answer: {
        type: String,
        required: true
      }
    }
  ],
  consentAgreed: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  expireAt: {
    type: Date,
    required: [true, 'Please add an expiry date']
  }
});

// CRITICAL: TTL Index for automatic deletion
// This ensures all submissions are deleted at the exact same time as their parent poll
SubmissionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Submission', SubmissionSchema);
