import { Router } from 'express';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  addVariantController,
  editVariantController,
  getVariantsController,
  unlistVariantController,
} from '../../controllers/product.controller.js';
import upload from '../../middlewares/multer/multer.js';
import adminAuth from '../../middlewares/auth/adminAuth.js';

const variantRouter = Router();

variantRouter.get('/:id', asyncHandler(getVariantsController));
variantRouter.patch('/unlist/:id', adminAuth, asyncHandler(unlistVariantController));
variantRouter.put('/:id', upload.any(), adminAuth, asyncHandler(editVariantController));
variantRouter.post('/:id', upload.any(), adminAuth, asyncHandler(addVariantController));
export default variantRouter;
