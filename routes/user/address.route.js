import { Router } from 'express';
import userAuth from '../../middlewares/auth/userAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  addAddress,
  deleteAddress,
  editAddress,
  getAddress,
} from '../../controllers/address.controller.js';

const addressRouter = Router();

addressRouter.post('/', userAuth, asyncHandler(addAddress));
addressRouter.get('/', userAuth, asyncHandler(getAddress));
addressRouter.put('/:id', userAuth, asyncHandler(editAddress));
addressRouter.delete('/:id', userAuth, asyncHandler(deleteAddress));

export default addressRouter;
