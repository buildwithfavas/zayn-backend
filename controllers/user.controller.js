import AppError from '../middlewares/Error/appError.js';
import {
  authMeService,
  chatService,
  editUserService,
  emailChangeOtpService,
  emailChangeResendOtpService,
  emailChangeVerifyService,
  facebookAuthService,
  forgotPasswordServices,
  getUserChartDataService,
  googleAuthService,
  refreshTokenService,
  registerUserService,
  resendOtpService,
  resetPasswordService,
  userImageUploadService,
  userLoginService,
  verifyEmailService,
} from '../services/user.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const registerUser = async (req, res) => {
  const { firstName, lastName, email, password, referralCode, gender } = req.body;
  if (!firstName || !lastName || !email || !password) {
    throw new AppError(
      'Provide email, first name, last name, and password',
      STATUS_CODES.BAD_REQUEST
    );
  }
  const user = await registerUserService({
    firstName,
    lastName,
    email,
    password,
    referralCode,
    gender,
  });
  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'User registered successfully , please verify your email',
    user,
  });
};

const verifyEmailController = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new AppError('Provide email and otp', STATUS_CODES.BAD_REQUEST);
  }
  await verifyEmailService({ email, otp });
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'email verified successfully',
  });
};

const resendOtp = async (req, res) => {
  const { email } = req.body;
  await resendOtpService(email);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'OTP Resend successfully ',
  });
};

const loginController = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError('Email and password are required', STATUS_CODES.BAD_REQUEST);
  }
  const { accessToken, refreshToken, user } = await userLoginService({ email, password });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOption = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };

  res.cookie('accessToken', accessToken, cookieOption);
  res.cookie('refreshToken', refreshToken, cookieOption);
  return res.status(STATUS_CODES.OK).json({
    message: 'login Successfully',
    error: false,
    success: true,
    user,
  });
};

const googleAuth = async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new AppError('Google authentication failed', STATUS_CODES.NOT_FOUND);
  }
  const { accessToken, refreshToken } = await googleAuthService(user);
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOption = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };

  res.cookie('accessToken', accessToken, cookieOption);
  res.cookie('refreshToken', refreshToken, cookieOption);
  return res.redirect(process.env.FRONTEND_URL + '/');
};

const facebookAuth = async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new AppError('Facebook authentication failed', STATUS_CODES.NOT_FOUND);
  }
  const { accessToken, refreshToken } = await facebookAuthService(user);

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOption = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };

  res.cookie('accessToken', accessToken, cookieOption);
  res.cookie('refreshToken', refreshToken, cookieOption);

  return res.redirect(process.env.FRONTEND_URL + '/');
};

const logoutController = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOption = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
  res.clearCookie('accessToken', cookieOption);
  res.clearCookie('refreshToken', cookieOption);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'User logged out successfully',
  });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError('Please enter email', STATUS_CODES.BAD_REQUEST);
  }
  await forgotPasswordServices(email);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'OTP send to your email',
  });
};

const resetPassword = async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;
  console.log(req.body);
  if (!email || !newPassword || !confirmPassword) {
    throw new AppError('All fields are required', STATUS_CODES.BAD_REQUEST);
  }
  if (newPassword !== confirmPassword) {
    throw new AppError(
      'new password and confirm password does not match',
      STATUS_CODES.BAD_REQUEST
    );
  }
  await resetPasswordService(email, newPassword);
  return res.status(STATUS_CODES.OK).json({
    message: 'password updated successfully',
    success: true,
    error: false,
  });
};

const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
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
  res.cookie('accessToken', newAccessToken, cookieOption);
  res.cookie('refreshToken', refreshToken, cookieOption);
  return res.status(STATUS_CODES.OK).json({
    message: 'new access token assigned',
    success: true,
    error: false,
    data: {
      accessToken: newAccessToken,
      refreshToken,
    },
  });
};

const authMe = async (req, res) => {
  const userId = req.userId;
  const user = await authMeService(userId);
  res.status(STATUS_CODES.OK).json({ user });
};

const chatController = async (req, res) => {
  const userId = req?.userId;
  const reply = await chatService(req.body, userId);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    reply,
  });
};

const userImageController = async (req, res) => {
  const userId = req.userId;
  const image = req.file;
  if (!image) {
    throw new AppError('Image is required', STATUS_CODES.BAD_REQUEST);
  }
  const result = await userImageUploadService(userId, image);
  return res.status(STATUS_CODES.OK).json(result);
};

const editUser = async (req, res) => {
  const userId = req.userId;
  const updated = editUserService(userId, req.body);
  return res.status(200).json({
    success: true,
    error: false,
    updated,
  });
};

const emailChangeOtpController = async (req, res) => {
  const userId = req.userId;
  const email = req.body.email;
  await emailChangeOtpService(userId, email);
  return res.status(200).json({
    success: true,
    error: false,
    message: 'Otp Send to the mail',
  });
};

const emailChangeOtpResend = async (req, res) => {
  const userId = req.userId;
  const email = req.body.email;
  console.log(email);
  await emailChangeResendOtpService(email, userId);
  return res.status(200).json({
    success: true,
    error: false,
    message: 'Otp Resend to the mail',
  });
};

const emailChangeVerifyController = async (req, res) => {
  const email = req.body.email;
  const otp = req.body.otp;
  await emailChangeVerifyService(email, otp);
  return res.status(200).json({
    success: true,
    error: false,
    message: 'Email Verified Successfully',
  });
};

const getUserChartData = async (req, res) => {
  const data = await getUserChartDataService(req.query);
  return res.status(200).json({ success: true, error: false, data });
};

export {
  registerUser,
  verifyEmailController,
  resendOtp,
  loginController,
  googleAuth,
  facebookAuth,
  logoutController,
  forgotPassword,
  resetPassword,
  refreshToken,
  authMe,
  chatController,
  userImageController,
  editUser,
  emailChangeOtpController,
  emailChangeOtpResend,
  emailChangeVerifyController,
  getUserChartData,
};
