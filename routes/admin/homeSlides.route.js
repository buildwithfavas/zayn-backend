import { Router } from 'express';
import adminAuth from '../../middlewares/auth/adminAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  editHomeSlideController,
  getHomeSlidesController,
  homeSlidesAddController,
  homeSlidesToggleBlockController,
} from '../../controllers/homeSlides.controller.js';
import upload from '../../middlewares/multer/multer.js';

const homeSlidesRouter = Router();

homeSlidesRouter.post(
  '/',
  adminAuth,
  upload.single('image'),
  asyncHandler(homeSlidesAddController)
);
homeSlidesRouter.get('/', asyncHandler(getHomeSlidesController));
homeSlidesRouter.put(
  '/:id',
  adminAuth,
  upload.single('image'),
  asyncHandler(editHomeSlideController)
);
homeSlidesRouter.patch('/block/:id', adminAuth, asyncHandler(homeSlidesToggleBlockController));

export default homeSlidesRouter;
