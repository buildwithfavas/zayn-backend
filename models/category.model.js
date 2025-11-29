import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    parentCatName: {
      type: String,
      default: '',
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    level: {
      type: String,
      enum: ['first', 'second', 'third'],
      default: 'first',
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null,
    },
  },
  { timestamps: true }
);

const categoryModel = mongoose.model('Category', categorySchema);
export default categoryModel;
