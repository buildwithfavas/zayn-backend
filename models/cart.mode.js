import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    required: true,
    ref: 'User',
  },
  product: {
    type: mongoose.Schema.ObjectId,
    required: true,
    ref: 'Product',
  },
  variant: {
    type: mongoose.Schema.ObjectId,
    required: true,
    ref: 'Variant',
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
});

const cartModel = mongoose.model('Cart', cartSchema);
export default cartModel;
