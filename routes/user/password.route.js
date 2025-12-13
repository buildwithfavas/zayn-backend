import { Router } from 'express';
import { forgotPassword, resetPassword } from '../../controllers/user.controller.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import { resetPassValidation } from '../../middlewares/validation/validationSchamas.js';
import { validationErrorHandle } from '../../middlewares/validation/validationHandle.js';

const PasswordRouter = Router();

PasswordRouter.post('/forgot', asyncHandler(forgotPassword));
PasswordRouter.patch(
  '/reset',
  resetPassValidation,
  validationErrorHandle,
  asyncHandler(resetPassword)
);

export default PasswordRouter;
