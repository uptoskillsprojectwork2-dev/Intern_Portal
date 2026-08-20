const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import the controllers and middleware you just created
const { register, login } = require('./src/controllers/authController');
const authMiddleware = require('./src/middleware/authMiddleware');

const app = express();

// Middleware to understand JSON data from the frontend
app.use(express.json());
app.use(cors());

// --- ROUTES ---
// 1. Register a new user
app.post('/api/auth/register', register);

// 2. Login and get a JWT token
app.post('/api/auth/login', login);

// 3. A protected route (requires the JWT token to access)
app.get('/api/intern/dashboard', authMiddleware, (req, res) => {
  res.json({ message: `Welcome! Your intern code is ${req.user.internCode}.` });
});

// --- DATABASE CONNECTION & SERVER START ---
const PORT = process.env.PORT || 5000;
// Note: 127.0.0.1 is the standard local IP address for your own computer
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intern_portal';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });