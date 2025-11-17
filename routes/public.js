const express = require('express');
const Poll = require('../models/Poll');
const Submission = require('../models/Submission');

const router = express.Router();

// @route   GET /api/public/poll/:pollId
// @desc    Get a single poll's details for the public submission form
// @access  Public
router.get('/poll/:pollId', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found or has expired' });
    }

    // Return only the necessary information for the public form
    res.json({
      poll: {
        id: poll._id,
        title: poll.title,
        description: poll.description,
        questions: poll.questions,
        expireAt: poll.expireAt
      }
    });
  } catch (error) {
    console.error('Get public poll error:', error);
    res.status(500).json({ message: 'Server error fetching poll' });
  }
});

// @route   POST /api/public/submit/:pollId
// @desc    Submit answers to a poll
// @access  Public
router.post('/submit/:pollId', async (req, res) => {
  try {
    const { participantName, participantEmail, participantPhone, answers } = req.body;

    // Validation
    if (!participantName || !participantEmail) {
      return res.status(400).json({ message: 'Please provide your name and email' });
    }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Please provide answers' });
    }

    // Find the parent poll
    const poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found or has expired' });
    }

    // Check if consent is required and was provided
    const { consentAgreed } = req.body;
    if (poll.consentEnabled && !consentAgreed) {
      return res.status(400).json({ message: 'You must agree to the consent terms to submit this poll' });
    }

    // Create submission with the same expireAt as the parent poll
    const submission = await Submission.create({
      poll: poll._id,
      participantName,
      participantEmail,
      participantPhone: participantPhone || '',
      answers,
      consentAgreed: poll.consentEnabled ? consentAgreed : false,
      expireAt: poll.expireAt // CRUCIAL: Same expiry as poll
    });

    res.status(201).json({
      message: 'Thank you for your submission!',
      submission
    });
  } catch (error) {
    console.error('Submit poll error:', error);
    res.status(500).json({ message: 'Server error submitting poll' });
  }
});

module.exports = router;
