import {
  addSizeService,
  blockSizeService,
  editSizeService,
  getSizesService,
} from '../services/size.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const addSize = async (req, res) => {
  const { label } = req.body;
  const size = await addSizeService(label);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Size added successfully',
    size,
  });
};

export const getSize = async (req, res) => {
  const sizes = await getSizesService();
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    sizes,
  });
};

export const blockSize = async (req, res) => {
  const id = req.params.id;
  const size = await blockSizeService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: size.isBlocked ? 'Size Blocked Successfully' : 'Size Unblocked Successfully',
  });
};

export const editSize = async (req, res) => {
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
