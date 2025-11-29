import mongoose from 'mongoose';
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    thirdSubCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

    images: [{ type: String, required: true }], // Array of image URLs

    isFeatured: { type: Boolean, default: false },
    isUnlisted: { type: Boolean, default: false },

    hasVariant: { type: Boolean, default: false },

    // Fields for Simple Products (if hasVariant: false)
    price: { type: Number, default: 0 },
    oldPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },

    // Fields for Variable Products (if hasVariant: true)
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Variant' }],

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

const productModel = mongoose.model('Product', productSchema);

export default productModel;
