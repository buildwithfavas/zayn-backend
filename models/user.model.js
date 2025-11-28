import mongoose from 'mongoose';
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required  '],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'please provide a valid email'],
    },
    password: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    mobile: {
      type: Number,
      default: null,
    },
    last_login_date: {
      type: Date,
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
    refresh_token: {
      type: String,
      default: '',
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
      default: '',
    },
  },
  {
    timestamps: true,
  }
);
userSchema.pre('save', async function (next) {
  if (this.isNew) {
    const base = this.name.slice(0, 3).toUpperCase();
    let exist = true;
    let code = '';
    while (exist) {
      const random = Math.floor(1000 + Math.random() * 9000);
      code = `${base}${random}`;
      exist = await userModel.exists({ referralCode: code });
    }
    this.referralCode = code;
  }
  next();
});
const userModel = mongoose.model('User', userSchema);
export default userModel;
