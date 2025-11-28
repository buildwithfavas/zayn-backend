import { Router } from 'express';
import { adminLogin, adminLogout } from '../../controllers/admin.controller.js';

const authRouter = Router();

authRouter.post('/login', adminLogin);
authRouter.post('/logout', adminLogout);

export default authRouter;
