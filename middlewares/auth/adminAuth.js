import jwt from 'jsonwebtoken';
import { STATUS_CODES } from '../../utils/statusCodes.js';

const adminAuth = (req, res, next) => {
  try {
    const token = req.cookies?.admin_accessToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token required',
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.adminId = decoded.id;
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

export default adminAuth;
