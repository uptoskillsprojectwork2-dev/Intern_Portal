const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  domain: { type: String, required: true },
  internCode: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['intern', 'admin', 'mentor'], default: 'intern' }
});

module.exports = mongoose.model('User', userSchema);