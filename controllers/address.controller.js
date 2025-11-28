import {
  addAddressService,
  deleteAddressService,
  editAddressService,
  getAddressService,
} from '../services/address.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const addAddress = async (req, res) => {
  const userId = req.userId;
  const body = req.body;
  const address = await addAddressService(body, userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    address,
  });
};

export const getAddress = async (req, res) => {
  const userId = req.userId;
  const addresses = await getAddressService(userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    addresses,
  });
};

export const editAddress = async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const address = await editAddressService(id, body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Address Edited Successfully',
    address,
  });
};

export const deleteAddress = async (req, res) => {
  const id = req.params.id;
  const address = await deleteAddressService(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Address Deleted Successfully',
    address,
  });
};
