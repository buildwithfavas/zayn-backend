import { Router } from 'express';
import userAuth from '../../middlewares/auth/userAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  addToCart,
  editItemCount,
  getCartItems,
  productValidation,
  removeFromCart,
} from '../../controllers/cart.controller.js';

const cartRouter = Router();

cartRouter.post('/', userAuth, asyncHandler(addToCart));
cartRouter.get('/', userAuth, asyncHandler(getCartItems));
cartRouter.delete('/:id', userAuth, asyncHandler(removeFromCart));
cartRouter.patch('/:id', userAuth, asyncHandler(editItemCount));
cartRouter.post('/validate', asyncHandler(productValidation));
export default cartRouter;
