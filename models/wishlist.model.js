import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Product',
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Variant',
    },
  },
  { timestamps: true }
);

const wishlistModal = mongoose.model('Wishlist', wishlistSchema);
export default wishlistModal;
