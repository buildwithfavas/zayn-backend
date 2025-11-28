import { Router } from 'express';
import adminAuth from '../../middlewares/auth/adminAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  addGlobalOfferController,
  addOfferProductController,
  addOfferToCategory,
  editCategoryOfferController,
  editGlobalOfferController,
  getCategoryOffersController,
  getGlobalOffersController,
  toggleOfferStatusController,
} from '../../controllers/offers.controller.js';

const offerRouter = Router();

offerRouter.post('/product', adminAuth, asyncHandler(addOfferProductController));
offerRouter.post('/category', adminAuth, asyncHandler(addOfferToCategory));
offerRouter.post('/', adminAuth, asyncHandler(addGlobalOfferController));

offerRouter.get('/category', adminAuth, asyncHandler(getCategoryOffersController));
offerRouter.get('/', adminAuth, asyncHandler(getGlobalOffersController));

offerRouter.patch('/category/status/:id', adminAuth, asyncHandler(toggleOfferStatusController));
offerRouter.patch('/category/:id', adminAuth, asyncHandler(editCategoryOfferController));
offerRouter.patch('/:id', adminAuth, asyncHandler(editGlobalOfferController));
offerRouter.patch('/status/:id', adminAuth, asyncHandler(toggleOfferStatusController));

export default offerRouter;
