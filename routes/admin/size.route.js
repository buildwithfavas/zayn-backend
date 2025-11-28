import { Router } from 'express';
import adminAuth from '../../middlewares/auth/adminAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import { addSize, blockSize, editSize, getSize } from '../../controllers/size.controller.js';

const sizeRouter = Router();

sizeRouter.post('/', adminAuth, asyncHandler(addSize));
sizeRouter.get('/', asyncHandler(getSize));
sizeRouter.post('/block/:id', adminAuth, asyncHandler(blockSize));
sizeRouter.put('edit/:id', adminAuth, asyncHandler(editSize));
export default sizeRouter;
