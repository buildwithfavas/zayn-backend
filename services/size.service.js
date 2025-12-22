import AppError from '../middlewares/Error/appError.js';
import sizeModel from '../models/size.model.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const addSizeService = async (label, category) => {
  // Check for duplicates within the specific category to allow same label in different categories if needed
  // or globally if stricter. Given the use case (S, M, L vs 8, 9, 10), global uniqueness isn't strictly necessary
  // but "S" in Footwear makes no sense. So scoping by category is better.
  const isExist = await sizeModel.find({
    label: { $regex: new RegExp(`^${label}$`, 'i') }, // Exact match case-insensitive
    category: category || 'fashion',
  });

  if (isExist.length > 0) {
    throw new AppError('Size already exists in this category', STATUS_CODES.CONFLICT);
  }

  const size = new sizeModel({
    label,
    category: category || 'fashion',
  });

  await size.save();
  return size;
};

const getSizesService = async () => {
  const sizes = await sizeModel.find();
  return sizes;
};

const blockSizeService = async (id) => {
  const size = await sizeModel.findByIdAndUpdate(
    id,
    [{ $set: { isBlocked: { $not: '$isBlocked' } } }],
    { new: true }
  );
  return size;
};

const editSizeService = async (id, label) => {
  const size = await sizeModel.findByIdAndUpdate(id, { label }, { new: true });
  return size;
};

const deleteSizeService = async (id) => {
  const size = await sizeModel.findByIdAndDelete(id);
  if (!size) {
    throw new AppError('Size not found', STATUS_CODES.NOT_FOUND);
  }
  return size;
};

export { addSizeService, getSizesService, blockSizeService, editSizeService, deleteSizeService };
