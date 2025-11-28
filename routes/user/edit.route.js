import { Router } from 'express';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  editUser,
  emailChangeOtpController,
  emailChangeOtpResend,
  emailChangeVerifyController,
  userImageController,
} from '../../controllers/user.controller.js';
import userAuth from '../../middlewares/auth/userAuth.js';
import upload from '../../middlewares/multer/multer.js';

const editRouter = Router();

editRouter.put('/image', userAuth, upload.single('image'), asyncHandler(userImageController));
editRouter.put('/', userAuth, asyncHandler(editUser));
editRouter.post('/email/otp', userAuth, asyncHandler(emailChangeOtpController));
editRouter.post('/email/otp/resend', userAuth, asyncHandler(emailChangeOtpResend));
editRouter.post('/email/verify', userAuth, asyncHandler(emailChangeVerifyController));

export default editRouter;
