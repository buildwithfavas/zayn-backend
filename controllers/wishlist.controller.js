import {
  addToWishlistService,
  getWishlistService,
  removeFromWishlist,
} from '../services/wishlist.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const addToWishlistController = async (req, res) => {
  const userId = req.userId;
  const item = await addToWishlistService(userId, req.body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    item,
  });
};

const getWishlistController = async (req, res) => {
  const userId = req.userId;
  const wishlist = await getWishlistService(userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    wishlist,
  });
};

const removeFormWishlistController = async (req, res) => {
  const id = req.params.id;
  const item = await removeFromWishlist(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    item,
  });
};

export { addToWishlistController, getWishlistController, removeFormWishlistController };
