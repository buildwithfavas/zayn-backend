import { Router } from 'express';
import userAuth from '../../middlewares/auth/userAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  addToWishlistController,
  getWishlistController,
  removeFormWishlistController,
} from '../../controllers/wishlist.controller.js';

const wishlistRouter = Router();

wishlistRouter.post('/', userAuth, asyncHandler(addToWishlistController));
wishlistRouter.get('/', userAuth, asyncHandler(getWishlistController));
wishlistRouter.delete('/:id', userAuth, asyncHandler(removeFormWishlistController));

export default wishlistRouter;
