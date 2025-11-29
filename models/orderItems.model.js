import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Variant',
      required: true,
    },
    size: { type: String, default: '' },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            'Confirmed',
            'Processing',
            'Shipped',
            'Out for Delivery',
            'Delivered',
            'Cancelled',
            'Return Requested',
            'Return Approved',
            'Return Rejected',
          ],
        },
        date: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
    cancelReason: { type: String, default: null },
    price: { type: Number, required: true },
    returnReason: { type: String, default: null },
    color: { type: String, default: '' },
    oldPrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        'Failed',
        'Confirmed',
        'Processing',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
        'Return Requested',
        'Return Approved',
        'Return Rejected',
      ],
      default: 'Confirmed',
    },
    review: {
      type: Object, // Or Ref to Review model if separate
      default: null,
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

const orderItemModel = mongoose.model('OrderItem', orderItemSchema);
export default orderItemModel;
