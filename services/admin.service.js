import AppError from '../middlewares/Error/appError.js';
import adminModel from '../models/admin.model.js';
import generateAccessToken from '../utils/generateAccessToken.js';
import generateRefreshToken from '../utils/generateRefreshToken.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const adminLoginService = async ({ email, password }) => {
  const admin = await adminModel.findOne({ email: email });
  if (!admin) {
    throw new AppError('Invalid email or password', STATUS_CODES.UNAUTHORIZED);
  }
  const checkPass = await bcrypt.compare(password, admin.password);
  if (!checkPass) {
    throw new AppError('Invalid email or password', STATUS_CODES.UNAUTHORIZED);
  }
  const accessToken = await generateAccessToken(admin._id, 'Admin');
  const refreshToken = await generateRefreshToken(admin._id, 'Admin');
  await adminModel.findByIdAndUpdate(admin._id, {
    last_login_date: new Date(),
  });
  return { accessToken, refreshToken, admin };
};
const refreshTokenService = async (token) => {
  const verifyToken = await jwt.verify(token, process.env.JWT_REFRESH_KEY);
  if (!verifyToken) {
    throw new AppError('Token expired', STATUS_CODES.NOT_FOUND);
  }
  const userId = verifyToken?.id;
  const newAccessToken = await generateAccessToken(userId, 'Admin');
  const refreshToken = await generateRefreshToken(userId, 'Admin');

  return { newAccessToken, refreshToken };
};

const authAdminService = async (adminId) => {
  const admin = await adminModel.findById(adminId).select('-password');
  if (!admin) {
    throw new AppError('Please Login, Admin not found', STATUS_CODES.NOT_FOUND);
  }
  return admin;
};

export { adminLoginService, refreshTokenService, authAdminService };
