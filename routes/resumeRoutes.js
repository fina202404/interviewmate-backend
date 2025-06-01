// backend/routes/resumeRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer'); // For handling file uploads
const { protect } = require('../middleware/authMiddleware'); // Assuming you want to protect this route

// Placeholder for resume analysis controller function
const { analyzeResumeContent } = require('../controllers/resumeController'); // We'll create this controller

// Configure multer for memory storage (to process file buffer)
// You can also configure it to save to disk if preferred
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
});

// @desc    Analyze uploaded resume
// @route   POST /api/resume-analyze
// @access  Private (or Public, adjust 'protect' middleware as needed)
router.post('/analyze', protect, upload.single('resume'), analyzeResumeContent);

module.exports = router;