import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
if (!process.env.MONGODB_URL) {
  throw new Error('please provide mongoDb Url ');
}
async function connectDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB Successfully');
  } catch (error) {
    console.error('❌ DATABASE CONNECTION ERROR ❌');
    console.error('------------------------------------------');
    console.error('Error details:', error.message);
    if (error.message.includes('SSL') && error.message.includes('alert')) {
      console.error('CAUSE: IP Address not whitelisted in MongoDB Atlas.');
      console.error('FIX: Go to MongoDB Atlas > Network Access > Add Current IP Address.');
    }
    console.error('------------------------------------------');
    process.exit(1);
  }
}
export default connectDb;
