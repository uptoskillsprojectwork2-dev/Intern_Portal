import express from 'express';
import mongoose from 'mongoose';
import hrRoutes from './src/routes/hr.routes.js';     // Updated path
import internRoutes from './src/routes/intern.routes.js'; // Updated path
import authRoutes from './src/routes/auth.routes.js';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use('/api/admin', hrRoutes);
app.use('/api/intern', internRoutes);
app.use('/api/auth', authRoutes);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/intern_portal';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log('Server running on port ' + PORT);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });
