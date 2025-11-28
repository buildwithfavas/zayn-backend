import { Router } from 'express';
import userAuth from '../../middlewares/auth/userAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  AddReviewController,
  cancelOrderByUser,
  createPaypalPayment,
  createRazorpayOrder,
  downloadInvoice,
  executePaypalPayment,
  getFailedOrderController,
  getOrderItemById,
  getOrders,
  orderWithWallet,
  placeOrder,
  retryFailedOrderWithCOD,
  retryFailedOrderWithWallet,
  retryFiledRazorpayVerify,
  returnRequestController,
  verifyRazorpayPayment,
} from '../../controllers/order.controller.js';

const orderRouter = Router();

orderRouter.post('/', userAuth, asyncHandler(placeOrder));
orderRouter.post('/wallet', userAuth, asyncHandler(orderWithWallet));
orderRouter.get('/', userAuth, asyncHandler(getOrders));
orderRouter.post('/failed/retry/razorpay', userAuth, asyncHandler(retryFiledRazorpayVerify));
orderRouter.post('/failed/retry/wallet', userAuth, asyncHandler(retryFailedOrderWithWallet));
orderRouter.post('/failed/retry', userAuth, asyncHandler(retryFailedOrderWithCOD));
orderRouter.get('/failed/:id', userAuth, asyncHandler(getFailedOrderController));
orderRouter.post('/razorpay/create-order', userAuth, asyncHandler(createRazorpayOrder));
orderRouter.post('/razorpay/verify', userAuth, asyncHandler(verifyRazorpayPayment));
orderRouter.post('/paypal/create', userAuth, asyncHandler(createPaypalPayment));
orderRouter.post('/paypal/success', userAuth, asyncHandler(executePaypalPayment));
orderRouter.get('/:id', userAuth, asyncHandler(getOrderItemById));
orderRouter.get('/:id/invoice', userAuth, asyncHandler(downloadInvoice));
orderRouter.patch('/cancel/:id', userAuth, asyncHandler(cancelOrderByUser));
orderRouter.patch('/return/:id', userAuth, asyncHandler(returnRequestController));
orderRouter.post('/:id/review', userAuth, asyncHandler(AddReviewController));

export default orderRouter;
