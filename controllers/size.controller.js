import {
  addSizeService,
  blockSizeService,
  editSizeService,
  getSizesService,
  deleteSizeService,
} from '../services/size.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const addSize = async (req, res) => {
  const { label, category } = req.body;
  const size = await addSizeService(label, category);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Size added successfully',
    size,
  });
};

const getSize = async (req, res) => {
  const sizes = await getSizesService();
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    sizes,
  });
};

const blockSize = async (req, res) => {
  const id = req.params.id;
  const size = await blockSizeService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: size.isBlocked ? 'Size Blocked Successfully' : 'Size Unblocked Successfully',
  });
};

const editSize = async (req, res) => {
  const id = req.params.id;
  const { label } = req.body;
  const size = await editSizeService(id, label);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Size Edited Successfully',
    size,
  });
};

const deleteSize = async (req, res) => {
  const id = req.params.id;
  await deleteSizeService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Size Deleted Successfully',
  });
};

export { addSize, getSize, blockSize, editSize, deleteSize };
