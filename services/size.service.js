import AppError from '../middlewares/Error/appError.js';
import sizeModel from '../models/size.model.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const addSizeService = async (label) => {
  const isExist = await sizeModel.find({ label: { $regex: label, $options: 'i' } });
  if (isExist) {
    throw new AppError('size already exist', STATUS_CODES.CONFLICT);
  }
  const size = new sizeModel({
    label,
  });

  await size.save();
  return size;
};

export const getSizesService = async () => {
  const sizes = await sizeModel.find();
  return sizes;
};

export const blockSizeService = async (id) => {
  const size = await sizeModel.findByIdAndUpdate(
    id,
    [{ $set: { isBlocked: { $not: '$isBlocked' } } }],
    { new: true }
  );
  return size;
};

export const editSizeService = async (id, label) => {
  const size = await sizeModel.findByIdAndUpdate(id, { label }, { new: true });
  return size;
};
