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
});

const sizeModel = mongoose.model('Size', sizeSchema);

export default sizeModel;
