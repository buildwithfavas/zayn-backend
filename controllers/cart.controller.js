import {
  addToCartService,
  editItemCountService,
  getCartItemsService,
  productValidationService,
  removeFromCartService,
} from '../services/cart.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const addToCart = async (req, res) => {
  const userId = req.userId;
  const body = req.body;
  const cartItem = await addToCartService(userId, body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    cartItem,
  });
};

export const removeFromCart = async (req, res) => {
  const id = req.params.id;
  const item = await removeFromCartService(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    item,
  });
};

export const editItemCount = async (req, res) => {
  const id = req.params.id;
  const mode = req.query.mode;
  const item = await editItemCountService(id, mode);
  console.log(item);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    item,
  });
};

export const getCartItems = async (req, res) => {
  const userId = req.userId;
  const items = await getCartItemsService(userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    items,
  });
};

export const productValidation = async (req, res) => {
  const body = req.body;
  const status = await productValidationService(body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    status,
  });
};
