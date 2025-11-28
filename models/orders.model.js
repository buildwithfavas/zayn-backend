import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const counterModel = mongoose.model('Counter', counterSchema);

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant',
    required: true,
  },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
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
  statusHistory: {
    type: [
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
  },
  cancelReason: { type: String, default: null },
  returnReason: { type: String, default: null },
  review: {
    comment: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      default: null,
    },
  },
});

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
    items: [orderItemSchema],
    shippingAddress: {
      name: { type: String, required: true },
      address_line: { type: String, required: true },
      city: { type: String, required: true },
      locality: { type: String, required: true },
      state: { type: String, required: true },
      pin_code: { type: String, required: true },
      mobile: { type: String, required: true },
      landmark: { type: String },
      alternative_mobile: {
        type: String,
      },
      type: { type: String, enum: ['Home', 'Office'], default: 'Home' },
    },
    payment: {
      method: {
        type: String,
        enum: ['COD', 'Wallet', 'Online'],
        required: true,
      },
      status: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending',
      },
      transactionId: { type: String },
    },
    orderStatus: {
      type: String,
      enum: [
        'Failed',
        'Confirmed',
        'Processing',
        'Partially Shipped',
        'Partially Delivered',
        'Completed',
        'Cancelled',
        'Return Approved',
        'Return Requested',
        'Return Rejected',
      ],
      default: 'Confirmed',
    },
    prices: {
      subtotal: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      couponDeduction: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
    coupon: {
      code: {
        type: String,
        default: '',
      },
      deduction: {
        type: Number,
        default: 0,
      },
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
  if (this.isModified('items')) {
    this.items.forEach((item) => {
      if (item.status == 'Failed') {
        return;
      }
      const lastHistory = item.statusHistory[item.statusHistory.length - 1];
      if (!lastHistory || lastHistory.status !== item.status) {
        item.statusHistory.push({
          status: item.status,
          date: new Date(),
        });
      }
    });
    const statuses = this.items.map((i) => i.status);
    if (statuses.every((s) => s === 'Failed')) {
      this.orderStatus = 'Failed';
    } else if (statuses.every((s) => s === 'Cancelled')) {
      this.orderStatus = 'Cancelled';
    } else if (statuses.every((s) => s === 'Return Approved')) {
      this.orderStatus = 'Return Approved';
    } else if (statuses.every((s) => s === 'Return Requested')) {
      this.orderStatus = 'Return Requested';
    } else if (statuses.every((s) => s === 'Return Rejected')) {
      this.orderStatus = 'Return Rejected';
    } else if (statuses.every((s) => s === 'Delivered')) {
      this.orderStatus = 'Completed';
    } else if (statuses.some((s) => s === 'Delivered')) {
      this.orderStatus = 'Partially Delivered';
    } else if (statuses.some((s) => ['Shipped', 'Out for Delivery'].includes(s))) {
      this.orderStatus = 'Partially Shipped';
    } else if (statuses.some((s) => s === 'Processing')) {
      this.orderStatus = 'Processing';
    } else {
      this.orderStatus = 'Confirmed';
    }
  }
  next();
});

const orderModel = mongoose.model('Order', orderSchema);
export default orderModel;
