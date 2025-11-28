import AppError from '../middlewares/Error/appError.js';
import wishlistModal from '../models/wishlist.model.js';
import { applyBestOffer } from '../utils/applyBestOffer.js';

export const addToWishlistService = async (userId, body) => {
  const isExist = await wishlistModal.find({
    user: userId,
    product: body.product,
    variant: body.variant,
  });
  if (isExist.length > 0) {
    throw new AppError('This Item is already in wishlist');
  }
  const item = await wishlistModal.create({
    user: userId,
    product: body.product,
    variant: body.variant,
  });
  return item;
};

export const getWishlistService = async (userId) => {
  const wishlist = await wishlistModal
    .find({ user: userId })
    .populate('product')
    .populate('variant');
  const items = await Promise.all(
    wishlist.map(async (item) => {
      item.variant = await applyBestOffer(item.variant);
      return item;
    })
  );
  return items;
};

export const removeFromWishlist = async (id) => {
  const wishlist = await wishlistModal.findByIdAndDelete(id);
  console.log(wishlist);
  return wishlist;
};
