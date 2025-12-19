import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    enum: ["fashion", "footwear", "cosmetics"],
    default: "fashion",
  },
});

const sizeModel = mongoose.model('Size', sizeSchema);

export default sizeModel;
