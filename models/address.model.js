import mongoose from 'mongoose';
const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: '',
    },
    address_line: {
      type: String,
      required: true,
      default: '',
    },
    city: {
      type: String,
      required: true,
      default: '',
    },
    locality: {
      type: String,
      required: true,
      default: '',
    },
    state: {
      type: String,
      required: true,
      default: '',
    },
    pin_code: {
      type: String,
      required: true,
      match: /^[0-9]{5,6}$/,
    },
    mobile: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/,
    },
    alternative_mobile: {
      type: String,
      match: /^[0-9]{10}$/,
    },
    landmark: {
      type: String,
      default: '',
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: '',
    },
    type: { type: String, enum: ['Home', 'Office'], default: 'Home' },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const addressModel = mongoose.model('Address', addressSchema);
export default addressModel;
