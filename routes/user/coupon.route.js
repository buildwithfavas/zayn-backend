import { Router } from 'express';
import userAuth from '../../middlewares/auth/userAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  applyCouponController,
  getCouponForUserController,
  removeAppliedCouponController,
} from '../../controllers/coupon.controller.js';

const couponRouter = Router();

couponRouter.get('/', userAuth, asyncHandler(getCouponForUserController));
couponRouter.post('/apply', userAuth, asyncHandler(applyCouponController));
couponRouter.post('/remove', userAuth, asyncHandler(removeAppliedCouponController));

export default couponRouter;
