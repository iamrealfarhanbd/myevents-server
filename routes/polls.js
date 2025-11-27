const express = require('express');
const Poll = require('../models/Poll');
const Submission = require('../models/Submission');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 🆕 PUBLIC ROUTE - Must be before protect middleware
// @route   GET /api/polls/public
// @desc    Get all active polls for public viewing
// @access  Public
router.get('/public', async (req, res) => {
  try {
    // Get all polls that haven't expired yet and populate user info
    const polls = await Poll.find({ expireAt: { $gte: new Date() } })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    
    // Transform polls to match the expected format
    const formattedPolls = await Promise.all(polls.map(async (poll) => {
      // Get the first question as the main question
      const mainQuestion = poll.questions[0] || {};
      
      // Count submissions for this poll
      const submissionCount = await Submission.countDocuments({ poll: poll._id });
      
      // Count votes for each option
      const submissions = await Submission.find({ poll: poll._id });
      const optionVotes = {};
      
      submissions.forEach(submission => {
        submission.answers.forEach(answer => {
          if (answer.questionId === mainQuestion.id) {
            optionVotes[answer.answer] = (optionVotes[answer.answer] || 0) + 1;
          }
        });
      });
      
      // Format options with vote counts
      const optionsWithVotes = (mainQuestion.options || []).map(option => ({
        text: option,
        votes: optionVotes[option] || 0
      }));
      
      return {
        _id: poll._id,
        question: mainQuestion.text || poll.title,
        description: poll.description,
        options: optionsWithVotes,
        startDate: poll.createdAt,
        endDate: poll.expireAt,
        location: '', // Polls don't have location, but keeping for consistency
        createdBy: poll.user?.name || 'Anonymous',
        createdAt: poll.createdAt,
        totalSubmissions: submissionCount
      };
    }));

    res.json({ 
      success: true,
      polls: formattedPolls 
    });
  } catch (error) {
    console.error('Get public polls error:', error);
    res.status(500).json({ message: 'Server error fetching polls' });
  }
});

// Apply protect middleware to all routes below this point
router.use(protect);

// @route   POST /api/polls
// @desc    Create a new poll
// @access  Protected
router.post('/', async (req, res) => {
  try {
    const { title, description, questions, expireAt, consentEnabled, consentText } = req.body;

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
      consentEnabled: consentEnabled || false,
      consentText: consentEnabled ? consentText : null,
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
    
    // Add submission count to each poll
    const pollsWithResponses = await Promise.all(polls.map(async (poll) => {
      const submissionCount = await Submission.countDocuments({ poll: poll._id });
      return {
        ...poll.toObject(),
        responses: Array(submissionCount).fill(null) // Create an array with length = submission count
      };
    }));
    
    res.json({ polls: pollsWithResponses });
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

    const { title, description, questions, expireAt, consentEnabled, consentText } = req.body;

    // Update poll
    poll.title = title || poll.title;
    poll.description = description !== undefined ? description : poll.description;
    poll.questions = questions || poll.questions;
    poll.expireAt = expireAt || poll.expireAt;
    poll.consentEnabled = consentEnabled !== undefined ? consentEnabled : poll.consentEnabled;
    poll.consentText = consentText !== undefined ? consentText : poll.consentText;

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
