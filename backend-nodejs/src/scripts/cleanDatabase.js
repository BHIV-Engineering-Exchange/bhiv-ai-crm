import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const cleanDatabase = async () => {
  try {
    console.log('🧹 Starting database cleanup...');

    const mongoUri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/ai_crm_logistics';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop all collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);

    for (const collection of collections) {
      console.log(`Dropping collection: ${collection.name}`);
      await db.dropCollection(collection.name);
    }

    console.log('✅ Database cleaned successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    process.exit(1);
  }
};

cleanDatabase();
