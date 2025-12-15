import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import adminModel from './models/admin.model.js';
import connectDb from './config/connectDb.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDb();

    const email = 'admin@gmail.com';
    const password = 'Admin@123';
    const name = 'Admin';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existingAdmin = await adminModel.findOne({ email });
    if (existingAdmin) {
      console.log('Admin already exists. Updating password...');
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      console.log('Admin password updated successfully');
      process.exit(0);
    }

    const newAdmin = new adminModel({
      name,
      email,
      password: hashedPassword,
      role: 'SuperAdmin',
    });

    await newAdmin.save();
    console.log('Admin created successfully');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
