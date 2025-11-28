import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'name is required'],
  },
  email: {
    type: String,
    required: [true, 'email is required'],
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'password is required'],
  },
  last_login_date: {
    type: Date,
    default: '',
  },
  refresh_token: {
    type: String,
    default: '',
  },
});

const adminModel = mongoose.model('Admin', adminSchema);
export default adminModel;
