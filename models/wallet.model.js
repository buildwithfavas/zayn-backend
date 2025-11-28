import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    history: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WalletTransaction',
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Wallet', walletSchema);
