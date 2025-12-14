import { Router } from 'express';
import {
  authMe,
  chatController,
  facebookAuth,
  googleAuth,
  loginController,
  logoutController,
  refreshToken,
  registerUser,
  resendOtp,
  verifyEmailController,
} from '../../controllers/user.controller.js';
import PasswordRouter from './password.route.js';
import { getAllCategories } from '../../controllers/category.controller.js';
import {
  loginValidation,
  signupValidation,
} from '../../middlewares/validation/validationSchamas.js';
import { validationErrorHandle } from '../../middlewares/validation/validationHandle.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import userAuth from '../../middlewares/auth/userAuth.js';
import passport from 'passport';
import editRouter from './edit.route.js';
import addressRouter from './address.route.js';
import cartRouter from './cart.route.js';
import orderRouter from './order.route.js';
import { getReviewsOController } from '../../controllers/order.controller.js';
import wishlistRouter from './wishlist.route.js';
import couponRouter from './coupon.route.js';
import walletRouter from './wallet.route.js';

const userRouter = Router();

userRouter.use('/password', PasswordRouter);
userRouter.use('/edit', editRouter);
userRouter.use('/address', addressRouter);
userRouter.use('/cart', cartRouter);
userRouter.use('/orders', orderRouter);
userRouter.use('/wishlist', wishlistRouter);
userRouter.use('/coupon', couponRouter);
userRouter.use('/wallet', walletRouter);

userRouter.post('/register', signupValidation, validationErrorHandle, asyncHandler(registerUser));
userRouter.post('/verify', asyncHandler(verifyEmailController));
userRouter.post('/resend', resendOtp);
userRouter.post('/login', loginValidation, validationErrorHandle, asyncHandler(loginController));
userRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    prompt: 'select_account',
  })
);
userRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=server_error&message=${encodeURIComponent('Authentication failed')}`,
    session: false,
  }),
  googleAuth
);
userRouter.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: ['email'],
    session: false,
  })
);
userRouter.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: process.env.FRONTEND_URL + '/login',
    session: false,
  }),
  facebookAuth
);

userRouter.get('/logout', userAuth, asyncHandler(logoutController));
userRouter.get('/refresh', asyncHandler(refreshToken));
userRouter.get('/categories', userAuth, asyncHandler(getAllCategories));
userRouter.get('/auth', userAuth, asyncHandler(authMe));
userRouter.post('/chat', asyncHandler(chatController));
userRouter.get('/reviews/:id', userAuth, asyncHandler(getReviewsOController));
export default userRouter;
