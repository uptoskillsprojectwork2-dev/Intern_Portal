import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const email = 'intern@test.com';
const password = 'intern123';

const createInternUser = async () => {
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
      fullName: 'Test Intern',
      email,
      password: hashedPassword,
      role: 'intern',
      mobileNo: '1111111111',
      internCode: 'INT-1001',
      domain: 'Web Development',
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Intern user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', result.insertedId);

    process.exit(0);
  } catch (error) {
    console.error('Error creating intern user:', error.message);
    process.exit(1);
  }
};

createInternUser();
