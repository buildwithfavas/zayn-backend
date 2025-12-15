import { Router } from 'express';
import categoryRouter from './category.route.js';
import productsRouter from './product.route.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import adminAuth from '../../middlewares/auth/adminAuth.js';
import {
  adminLoginController,
  adminLogoutController,
  authAdminController,
  refreshToken,
} from '../../controllers/admin.controller.js';
import { loginValidation } from '../../middlewares/validation/validationSchamas.js';
import { validationErrorHandle } from '../../middlewares/validation/validationHandle.js';
import usersRouter from './users.route.js';
import sizeRouter from './size.route.js';
import homeSlidesRouter from './homeSlides.route.js';
import adminOrderRouter from './order.route.js';
import offerRouter from './offer.route.js';
import couponRouter from './coupen.route.js';

const adminRouter = Router();
adminRouter.use('/category', categoryRouter);
adminRouter.use('/products', productsRouter);
adminRouter.use('/users', usersRouter);
adminRouter.use('/size', sizeRouter);
adminRouter.use('/homeSlides', homeSlidesRouter);
adminRouter.use('/orders', adminOrderRouter);
adminRouter.use('/offers', offerRouter);
adminRouter.use('/coupon', couponRouter);

adminRouter.post(
  '/login',
  loginValidation,
  validationErrorHandle,
  asyncHandler(adminLoginController)
);
adminRouter.get('/logout', adminAuth, asyncHandler(adminLogoutController));
adminRouter.get('/auth', adminAuth, asyncHandler(authAdminController));
adminRouter.get('/refresh', asyncHandler(refreshToken));

export default adminRouter;
