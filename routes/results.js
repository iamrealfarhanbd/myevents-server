const express = require('express');
const Poll = require('../models/Poll');
const Submission = require('../models/Submission');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// @route   GET /api/results/:pollId
// @desc    Get poll results (poll details + all submissions)
// @access  Protected
router.get('/:pollId', async (req, res) => {
  try {
    // Fetch the poll
    const poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found or has expired' });
    }

    // Security: Verify the logged-in user is the owner of the poll
    if (poll.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view these results' });
    }

    // Fetch all submissions for this poll
    const submissions = await Submission.find({ poll: req.params.pollId }).sort({ submittedAt: -1 });

    res.json({
      poll: {
        id: poll._id,
        title: poll.title,
        questions: poll.questions,
        createdAt: poll.createdAt,
        expireAt: poll.expireAt
      },
      submissions,
      totalSubmissions: submissions.length
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Server error fetching results' });
  }
});

module.exports = router;
