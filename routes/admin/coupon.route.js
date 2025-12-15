import { Router } from 'express';
import adminAuth from '../../middlewares/auth/adminAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  addCouponController,
  editCouponController,
  getCouponsController,
  toggleCouponStatusController,
} from '../../controllers/coupon.controller.js';

const couponRouter = Router();

couponRouter.post('/', adminAuth, asyncHandler(addCouponController));
couponRouter.get('/', adminAuth, asyncHandler(getCouponsController));
couponRouter.put('/:id', adminAuth, asyncHandler(editCouponController));
couponRouter.patch('/:id', adminAuth, asyncHandler(toggleCouponStatusController));

export default couponRouter;
