import { Router } from 'express';
import {
  addProductsController,
  getAllProductsController,
  getProductByIdController,
  getSearchSuggestions,
  unlistProductController,
  updateProductController,
} from '../../controllers/product.controller.js';
import upload from '../../middlewares/multer/multer.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import adminAuth from '../../middlewares/auth/adminAuth.js';
import variantRouter from './variants.route.js';
import {
  editProductValidation,
  productValidation,
} from '../../middlewares/validation/validationSchemas.js';
import { validationErrorHandle } from '../../middlewares/validation/validationHandle.js';
const productsRouter = Router();

productsRouter.use('/variants', variantRouter);

productsRouter.get('/', asyncHandler(getAllProductsController));
productsRouter.post(
  '/',
  upload.any(),
  productValidation,
  validationErrorHandle,
  asyncHandler(addProductsController)
);
productsRouter.put(
  '/:id',
  editProductValidation,
  validationErrorHandle,
  adminAuth,
  asyncHandler(updateProductController)
);
productsRouter.get('/:id', asyncHandler(getProductByIdController));
productsRouter.patch('/unlist/:id', adminAuth, asyncHandler(unlistProductController));
productsRouter.get('/search/suggestions', asyncHandler(getSearchSuggestions));
export default productsRouter;
