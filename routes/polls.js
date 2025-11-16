const express = require('express');
const Poll = require('../models/Poll');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// @route   POST /api/polls
// @desc    Create a new poll
// @access  Protected
router.post('/', async (req, res) => {
  try {
    const { title, description, questions, expireAt } = req.body;

    // Validation
    if (!title || !questions || !expireAt) {
      return res.status(400).json({ message: 'Please provide title, questions, and expiry date' });
    }

    // Create poll
    const poll = await Poll.create({
      title,
      description: description || '',
      questions,
      expireAt,
      user: req.user.id
    });

    res.status(201).json({
      message: 'Poll created successfully',
      poll
    });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ message: 'Server error creating poll' });
  }
});

// @route   GET /api/polls
// @desc    Get all polls for logged-in user
// @access  Protected
router.get('/', async (req, res) => {
  try {
    const polls = await Poll.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ polls });
  } catch (error) {
    console.error('Get polls error:', error);
    res.status(500).json({ message: 'Server error fetching polls' });
  }
});

// @route   GET /api/polls/:id
// @desc    Get a single poll by ID
// @access  Protected
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Security: Check if the logged-in user owns this poll
    if (poll.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this poll' });
    }

    res.json({ poll });
  } catch (error) {
    console.error('Get poll error:', error);
    res.status(500).json({ message: 'Server error fetching poll' });
  }
});

// @route   PUT /api/polls/:id
// @desc    Update a poll
// @access  Protected
router.put('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Security: Check if the logged-in user owns this poll
    if (poll.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this poll' });
    }

    const { title, description, questions, expireAt } = req.body;

    // Update poll
    poll.title = title || poll.title;
    poll.description = description !== undefined ? description : poll.description;
    poll.questions = questions || poll.questions;
    poll.expireAt = expireAt || poll.expireAt;

    await poll.save();

    res.json({
      message: 'Poll updated successfully',
      poll
    });
  } catch (error) {
    console.error('Update poll error:', error);
    res.status(500).json({ message: 'Server error updating poll' });
  }
});

// @route   DELETE /api/polls/:id
// @desc    Delete a poll
// @access  Protected
router.delete('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Security: Check if the logged-in user owns this poll
    if (poll.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this poll' });
    }

    await Poll.findByIdAndDelete(req.params.id);

    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Delete poll error:', error);
    res.status(500).json({ message: 'Server error deleting poll' });
  }
});

module.exports = router;
