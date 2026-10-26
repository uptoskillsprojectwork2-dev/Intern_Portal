import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const email = 'admin@uptoskills.com';
const password = 'admin123';

const createUser = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('MONGO_URI is not defined in backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const existing = await mongoose.connection.db.collection('users').findOne({ email });

    if (existing) {
      console.log('User already exists:', email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await mongoose.connection.db.collection('users').insertOne({
      fullName: 'Admin User',
      email,
      password: hashedPassword,
      role: 'admin',
      mobileNo: '0000000000',
      internCode: 'ADMIN-001',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Admin user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', result.insertedId);

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
};

createUser();
