import { STATUS_CODES } from '../utils/statusCodes.js';
import AppError from '../middlewares/Error/appError.js';
import {
  adminLoginService,
  authAdminService,
  refreshTokenService,
} from '../services/admin.service.js';

const adminLoginController = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError('Email and password are required', STATUS_CODES.BAD_REQUEST);
  }
  const { accessToken, refreshToken, admin } = await adminLoginService({ email, password });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOption = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
  res.cookie('admin_accessToken', accessToken, cookieOption);
  res.cookie('admin_refreshToken', refreshToken, cookieOption);
  return res.status(STATUS_CODES.OK).json({
    message: 'login Successfully',
    error: false,
    success: true,
    admin,
  });
};
const refreshToken = async (req, res) => {
  const token = req.cookies.admin_refreshToken;
  if (!token) {
    throw new AppError('Please provide token', STATUS_CODES.UNAUTHORIZED);
  }
  const { newAccessToken, refreshToken } = await refreshTokenService(token);
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOption = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
  res.cookie('admin_accessToken', newAccessToken, cookieOption);
  res.cookie('admin_refreshToken', refreshToken, cookieOption);
  return res.status(STATUS_CODES.OK).json({
    message: 'new access token assigned',
    success: true,
    error: false,
    data: {
      accessToken: newAccessToken,
    },
  });
};

const authAdminController = async (req, res) => {
  const adminId = req.adminId;
  const user = await authAdminService(adminId);
  res.status(STATUS_CODES.OK).json({ user });
};

const adminLogoutController = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOption = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
  res.clearCookie('admin_accessToken', cookieOption);
  res.clearCookie('admin_refreshToken', cookieOption);
  return res.status(STATUS_CODES.OK).json({
    message: 'Admin Logged Out Successfully',
    error: false,
    success: true,
  });
};

export { adminLoginController, refreshToken, authAdminController, adminLogoutController };
