import mongoose from 'mongoose';

// Fail fast when no connection is available instead of hanging indefinitely
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    const message = 'MONGO_URI environment variable is required for database connection.';
    console.error(message);
    throw new Error(message);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

export default connectDB;
