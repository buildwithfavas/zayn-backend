import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    otp: {
      type: String,
      required: true,
    },
    otp_expiry: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: '5m' },
    },
  },
  { timestamps: true }
);

const OtpModel = mongoose.model('Otp', otpSchema);

export default OtpModel;
