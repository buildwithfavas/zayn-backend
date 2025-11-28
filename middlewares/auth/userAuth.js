import jwt from 'jsonwebtoken';
import { STATUS_CODES } from '../../utils/statusCodes.js';
import userModel from '../../models/user.model.js';

const userAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token required',
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await userModel.findById(decoded.id);
    if (user.isBlocked) {
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOption = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
      };
      res.clearCookie('accessToken', cookieOption);
      res.clearCookie('refreshToken', cookieOption);
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: true,
        error: false,
        message: 'User blocked By admin',
      });
    }
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: 'Token expired, please login again',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid token',
      });
    }
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export default userAuth;
