import mongoose from 'mongoose';
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    thirdSubCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    rating: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tags: [{ type: String }],
    dateCreated: { type: Date, default: Date.now },
    isFeatured: { type: Boolean, default: false },
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Variant' }],
    isUnlisted: { type: Boolean, default: false },
    reviewCount: { type: Number, default: '' },
  },
  { timestamps: true }
);

const productModel = mongoose.model('Product', productSchema);

export default productModel;
