import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
if (!process.env.MONGODB_URL) {
  throw new Error('please provide mongoDb Url ');
}
async function connectDb() {
  try {
    mongoose.connect(process.env.MONGODB_URL);
    console.log('connected to MongoDb');
  } catch (error) {
    console.log('error happened while connecting to database', error);
    process.exit(1);
  }
}
export default connectDb;
