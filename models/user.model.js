import mongoose from 'mongoose';
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Other',
    },
    mobile: {
      type: String, // Changed to String to handle country codes etc.
      default: null,
    },
    image: {
      type: String,
      default: '',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default: '',
    },
    appleId: {
      type: String,
      default: '',
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined to be unique
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
    },
    last_login_date: {
      type: Date,
      default: null,
    },
    refresh_token: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (this.isNew && !this.referralCode) {
    const base = (this.firstName || 'USER').slice(0, 3).toUpperCase();
    let exist = true;
    let code = '';
    while (exist) {
      const random = Math.floor(1000 + Math.random() * 9000);
      code = `${base}${random}`;
      // Access model via this.constructor to avoid circular dependency issues or undefined userModel
      const User = this.constructor;
      exist = await User.exists({ referralCode: code });
    }
    this.referralCode = code;
  }
  next();
});

const userModel = mongoose.model('User', userSchema);
export default userModel;
