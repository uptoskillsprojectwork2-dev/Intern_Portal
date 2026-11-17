import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!mongoUri || !email || !password) {
  console.error('[FATAL] MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in environment variables.');
  process.exit(1);
}

if (password.length < 8) {
  console.error('[FATAL] ADMIN_PASSWORD must be at least 8 characters long.');
  process.exit(1);
}

const createAdmin = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin user already exists:', email);
      await mongoose.disconnect();
      process.exit(0);
    }

    const admin = await User.create({
      fullName: 'System Admin',
      email,
      password,
      role: 'admin',
      internCode: 'ADMIN-001',
    });

    console.log('Admin user created successfully');
    console.log('Email:', admin.email);
    console.log('User ID:', admin._id.toString());

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createAdmin();
