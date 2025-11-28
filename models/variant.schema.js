import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    color: { type: String, default: null },
    size: { type: String, default: null },
    weight: { type: String, default: null },
    price: { type: Number, required: true },
    oldPrice: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    images: [{ type: String }],
    isUnlisted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const variantModel = mongoose.model('Variant', variantSchema);

export default variantModel;
