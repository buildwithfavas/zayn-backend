import mongoose from 'mongoose';
import counterModel from './counter.model.js'; // Import counter model

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderItem',
      },
    ],
    shippingAddress: {
      name: { type: String, required: true },
      addressLine: { type: String, required: true }, // Changed to addressLine
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true }, // Changed to pincode
      mobile: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'Razorpay', 'Wallet'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed'],
      default: 'Pending',
    },
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: [
        'Failed',
        'Confirmed',
        'Processing',
        'Shipped',
        'Delivered',
        'Cancelled',
        'Return Approved',
        'Return Requested',
        'Return Rejected',
      ],
      default: 'Confirmed',
    },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counter = await counterModel.findOneAndUpdate(
      { name: 'orderId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderId = `ORD-${today}-${String(counter.seq).padStart(4, '0')}`;
  }
  next();
});

const orderModel = mongoose.model('Order', orderSchema);
export default orderModel;
