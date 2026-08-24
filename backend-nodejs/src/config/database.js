import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDatabase = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const mongoUri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/ai_crm_logistics';
    await mongoose.connect(mongoUri, options);
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ Primary MongoDB Connection Failed:', error.message);
    try {
      console.log('🔄 Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/ai_crm_logistics)...');
      await mongoose.connect('mongodb://127.0.0.1:27017/ai_crm_logistics', { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Fallback Local MongoDB Connected Successfully');
    } catch (fallbackErr) {
      console.warn('⚠️ MongoDB Offline Mode — SETU Server starting with in-memory fallback.');
    }
  }
};

export default connectDatabase;
