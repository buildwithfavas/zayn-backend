import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    attributeName: { type: String, default: 'Size' }, // e.g., "Size", "Volume"
    attributeValue: { type: String, required: true }, // e.g., "XL", "50ml"
    price: { type: Number, required: true },
    oldPrice: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    isUnlisted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const variantModel = mongoose.model('Variant', variantSchema);

export default variantModel;
