import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refereeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    refereeEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed'],
      default: 'Pending',
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const referralModel = mongoose.model('Referral', referralSchema);
export default referralModel;
