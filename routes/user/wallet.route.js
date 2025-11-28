import { Router } from 'express';
import userAuth from '../../middlewares/auth/userAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import { createRazorpayOrder } from '../../controllers/order.controller.js';
import {
  addMoneyToWalletController,
  getWalletController,
  getWalletTransactions,
} from '../../controllers/wallet.controller.js';

const walletRouter = Router();

walletRouter.post('/create-order', userAuth, asyncHandler(createRazorpayOrder));
walletRouter.post('/add', userAuth, asyncHandler(addMoneyToWalletController));
walletRouter.get('/', userAuth, asyncHandler(getWalletController));
walletRouter.get('/transactions', userAuth, asyncHandler(getWalletTransactions));

export default walletRouter;
