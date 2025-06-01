// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer'); // Import multer for handling its specific errors
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser: Allows us to accept JSON data in the body
app.use(express.json());

// Enable CORS - Cross-Origin Resource Sharing
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  // credentials: true // Only if you specifically need cookies/auth headers from a different subdomain to be sent
}));

// --- Mount routers ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const questionRoutes = require('./routes/questionRoutes'); // For /api/get-questions
const analyzeRoutes = require('./routes/analyzeRoutes');   // For /api/analyze
const resumeRoutes = require('./routes/resumeRoutes');     // <<--- IMPORT THE NEW RESUME ROUTE

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);   // Handles /api/users/profile
app.use('/api/admin', adminRoutes);  // Handles /api/admin/users/*

// Frontend expects /api/get-questions and /api/analyze
// Mount them specifically.
app.use('/api/get-questions', questionRoutes); // Handles POST /api/get-questions
app.use('/api/analyze', analyzeRoutes);     // Handles POST /api/analyze
app.use('/api/resume', resumeRoutes);       // <<--- MOUNT THE NEW RESUME ROUTE (e.g., /api/resume/analyze)


// Basic Error Handling Middleware (Updated to handle multer errors specifically)
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err.message || err);

  // Handle Multer-specific errors (e.g., file too large, wrong file type)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `File Upload Error: ${err.message}`,
      code: err.code // e.g., 'LIMIT_FILE_SIZE', 'LIMIT_UNEXPECTED_FILE'
    });
  }
  // Handle custom errors passed to next(err) for file type from fileFilter
  if (err.message === 'Only PDF files are allowed!') {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Default error handling
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    message: message,
    // Optionally include stack in development
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});


const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown for unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message || err}`);
  server.close(() => process.exit(1));
});