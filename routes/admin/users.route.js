import { Router } from 'express';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import { blockUserController, getUsers } from '../../controllers/userManagement.controller.js';
import adminAuth from '../../middlewares/auth/adminAuth.js';
import { getUserChartData } from '../../controllers/user.controller.js';

const usersRouter = Router();

usersRouter.get('/', adminAuth, asyncHandler(getUsers));
usersRouter.get('/chart', adminAuth, asyncHandler(getUserChartData));
usersRouter.post('/block/:id', adminAuth, asyncHandler(blockUserController));
export default usersRouter;
