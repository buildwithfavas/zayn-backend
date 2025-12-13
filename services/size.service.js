import AppError from '../middlewares/Error/appError.js';
import sizeModel from '../models/size.model.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const addSizeService = async (label) => {
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

export { addSizeService, getSizesService, blockSizeService, editSizeService };
