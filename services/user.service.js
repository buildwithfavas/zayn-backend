import userModel from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import verifyMailTemplate from '../utils/templates/verifyMailTemplate.js';
import generateAccessToken from '../utils/generateAccessToken.js';
import generateRefreshToken from '../utils/generateRefreshToken.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { getSignedImageUrl } from '../utils/getImageFromCloudinary.js';
import AppError from '../middlewares/Error/appError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import productModel from '../models/product.model.js';
import { GoogleGenAI } from '@google/genai';
import sendEmail from '../config/emailService.js';
import OtpModel from '../models/otpModel.js';
import couponModel from '../models/coupon.model.js';
import { generateReferralCode } from '../utils/generateReferralCode.js';

const ai = new GoogleGenAI({ apiKey: process.env.AI_KEY });
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRETE_KEY,
  secure: true,
});

export const registerUserService = async ({
  firstName,
  lastName,
  email,
  password,
  referralCode,
}) => {
  // Check if user already exists in the database
  const existingUser = await userModel.findOne({ email: email });
  if (existingUser) {
    throw new AppError('User already exists with this email address', STATUS_CODES.CONFLICT);
  }

  // Check if there's already a pending registration for this email
  const pendingRegistration = await OtpModel.findOne({ email: email });
  if (pendingRegistration) {
    // Delete old pending registration and create a new one
    await OtpModel.deleteOne({ email: email });
  }

  // Hash password before storing
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Validate referral code if provided (but don't create coupon yet)
  if (referralCode) {
    const referred = await userModel.findOne({ referralCode });
    if (!referred) {
      throw new AppError('Invalid referral code', STATUS_CODES.BAD_REQUEST);
    }
  }

  // Store all registration data temporarily in OTP model
  await OtpModel.create({
    email: email,
    otp: otp,
    otp_expiry: Date.now() + 60000,
    firstName: firstName,
    lastName: lastName,
    password: hashedPassword,
    referralCode: referralCode || null,
  });

  // Send verification email
  await sendEmail({
    to: email,
    subject: 'Verification mail from zayn collection',
    text: `Your OTP is ${otp}`,
    html: verifyMailTemplate(`${firstName} ${lastName}`, otp),
  });

  return { email, firstName, lastName };
};

export const verifyEmailService = async ({ email, otp }) => {
  // Find pending registration by email
  const pendingRegistration = await OtpModel.findOne({ email: email });
  if (!pendingRegistration) {
    throw new AppError('No pending registration found for this email', STATUS_CODES.NOT_FOUND);
  }

  // Verify OTP
  const isCodeValid = pendingRegistration.otp == otp;
  const isNotExpired = pendingRegistration.otp_expiry > new Date();

  if (!isCodeValid) {
    throw new AppError('Invalid OTP', STATUS_CODES.BAD_REQUEST);
  } else if (!isNotExpired) {
    throw new AppError('OTP expired', STATUS_CODES.BAD_REQUEST);
  }

  // OTP is valid - now create the user in the database
  const user = new userModel({
    email: pendingRegistration.email,
    password: pendingRegistration.password, // Already hashed
    firstName: pendingRegistration.firstName,
    lastName: pendingRegistration.lastName,
    isVerified: true, // Mark as verified immediately
  });

  await user.save();

  // Handle referral code logic after user creation
  if (pendingRegistration.referralCode) {
    const referred = await userModel.findOne({ referralCode: pendingRegistration.referralCode });
    if (referred) {
      const expiryDate = new Date().setDate(new Date().getDate() + 30);
      const code = await generateReferralCode(referred.firstName);
      await couponModel.create({
        code,
        description: 'Referral Coupon offers 30% of offer for orders above Rs.100',
        discountType: 'Percentage',
        discountValue: 30,
        allowedUsers: [referred._id],
        scope: 'User',
        minPurchaseAmount: 300,
        expiryDate,
      });
    }
  }

  // Clean up - delete the pending registration
  await OtpModel.deleteOne({ email: email });

  return true;
};

export const resendOtpService = async (email) => {
  // Find pending registration by email
  const pendingRegistration = await OtpModel.findOne({ email: email });
  if (!pendingRegistration) {
    throw new AppError('No pending registration found for this email', STATUS_CODES.NOT_FOUND);
  }

  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Update existing OTP record
  pendingRegistration.otp = otp;
  pendingRegistration.otp_expiry = Date.now() + 60000;
  await pendingRegistration.save();

  // Resend verification email
  await sendEmail({
    to: email,
    subject: 'Verification mail from Zayn Collection',
    text: `Your OTP is ${otp}`,
    html: verifyMailTemplate(
      `${pendingRegistration.firstName} ${pendingRegistration.lastName}`,
      otp
    ),
  });
};

export const userLoginService = async ({ email, password }) => {
  const user = await userModel.findOne({ email: email });

  if (!user) {
    throw new AppError('Invalid email address', STATUS_CODES.NOT_FOUND);
  }
  if (user.isBlocked) {
    throw new AppError('You are blocked, contact admin', STATUS_CODES.FORBIDDEN);
  }
  if (!user.isVerified) {
    throw new AppError('Please verify your email', STATUS_CODES.FORBIDDEN);
  }
  if (!user.password) {
    throw new AppError('No password ser for this email', STATUS_CODES.FORBIDDEN);
  }
  const checkPass = await bcrypt.compare(password, user.password);
  if (!checkPass) {
    throw new AppError('Incorrect password', STATUS_CODES.BAD_REQUEST);
  }
  const accessToken = await generateAccessToken(user._id, 'User');
  const refreshToken = await generateRefreshToken(user._id, 'User');
  await userModel.findByIdAndUpdate(user._id, {
    last_login_date: new Date(),
  });
  return { accessToken, refreshToken, user };
};

export const googleAuthService = async (user) => {
  const accessToken = await generateAccessToken(user._id, 'User');
  const refreshToken = await generateRefreshToken(user._id, 'User');
  return { accessToken, refreshToken };
};

export const forgotPasswordServices = async (email) => {
  const user = await userModel.findOne({ email: email });
  if (!user) {
    throw new AppError('User not found', STATUS_CODES.NOT_FOUND);
  }
  const userOtp = await OtpModel.findOne({ userId: user._id });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  if (userOtp) {
    userOtp.otp = otp;
    userOtp.otp_expiry = Date.now() + 60000;
    await userOtp.save();
  } else {
    await OtpModel.create({
      userId: user._id,
      otp: otp,
      otp_expiry: Date.now() + 60000,
    });
  }
  await user.save();
  await sendEmail({
    to: email,
    subject: 'Verification mail from Zayn Collection',
    text: `Your OTP is ${otp}`,
    html: verifyMailTemplate(`${user.firstName} ${user.lastName}`, otp),
  });
};

export const resetPasswordService = async (email, newPassword, currentPassword) => {
  const user = await userModel.findOne({ email: email });
  const userOtp = await OtpModel.findOne({ userId: user._id });
  if (userOtp && !userOtp.isVerified) {
    throw new AppError('Please verify your mail');
  }
  if (!user.isVerified) {
    throw new AppError('Please verify your mail');
  }
  if (currentPassword) {
    const verify = await bcrypt.compare(currentPassword, user.password);
    if (!verify) {
      throw new AppError('Incorrect password', STATUS_CODES.BAD_REQUEST);
    }
  }
  if (user.password) {
    const isSameWithOld = await bcrypt.compare(newPassword, user.password);
    if (isSameWithOld) {
      throw new AppError('New Password is Same with Old Password');
    }
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  user.password = hashedPassword;
  await user.save();
};

export const refreshTokenService = async (token) => {
  const verifyToken = await jwt.verify(token, process.env.JWT_REFRESH_KEY);
  if (!verifyToken) {
    throw new AppError('Token expired', STATUS_CODES.NOT_FOUND);
  }
  const userId = verifyToken?.id;
  const newAccessToken = await generateAccessToken(userId, 'User');
  const refreshToken = await generateRefreshToken(userId, 'User');

  return { newAccessToken, refreshToken };
};

export const authMeService = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new AppError('Please Login, User not found', STATUS_CODES.NOT_FOUND);
  }
  let obj = user.toObject();
  if (user.googleId && user.image.includes('googleusercontent')) {
    obj.image = obj.image || null;
  } else if (user.appleId && !user.image) {
    obj.image = null; // Apple doesn't provide a public profile image URL easily like FB/Google
  } else {
    obj.image = user.image ? getSignedImageUrl(user.image) : null;
  }
  if (obj.password) {
    obj.password = true;
  } else {
    obj.password = false;
  }
  return obj;
};

export const facebookAuthService = async (user) => {
  const accessToken = await generateAccessToken(user._id, 'User');
  const refreshToken = await generateRefreshToken(user._id, 'User');
  return { accessToken, refreshToken };
};

export const chatService = async (body, userId) => {
  const { query } = body;

  let contextData = '';

  const user = await userModel.findById(userId);
  if (user) {
    contextData += `User Info: Name is ${user.firstName} ${user.lastName}, Email is ${user.email}. `;
  } else {
    contextData += 'User Info: No specific user information available. ';
  }
  const products = await productModel
    .find({
      name: { $regex: query, $options: 'i' },
    })
    .populate('variants')
    .limit(5);

  if (products.length > 0) {
    const productDetails = products.map((p) => `${p.name} price: ₹${p.variants[0].price})`);
    contextData += `Available Products matching your query: ${productDetails.join(', ')}. `;
  } else {
    contextData += 'No products found matching your query. ';
  }

  const aiPrompt = `
    You are an E-commerce Assistant for our online store.
    Your goal is to help users find products and answer their questions related to our products and services.
    Do not provide general knowledge or engage in off-topic conversations.
    Stick to information related to the provided context and user queries.

    Context:
    ${contextData}

    User Query:
    ${query}

    Based on the above information, please provide a concise and helpful e-commerce-related response.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: aiPrompt,
  });

  const reply = response.text;

  return reply;
};

export const userImageUploadService = async (userId, image) => {
  const user = await userModel.findOne({ _id: userId });
  if (!user) throw new AppError('User not found', STATUS_CODES.NOT_FOUND);
  const imgUrl = user.image;
  if (imgUrl) {
    const imageName = imgUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(imageName, { type: 'authenticated' });
  }

  const options = {
    folder: 'users',
    type: 'authenticated',
    use_filename: true,
    unique_filename: false,
    overwrite: false,
  };
  const result = await cloudinary.uploader.upload(image.path, options);
  fs.unlinkSync(`uploads/${image.filename}`);

  user.image = result.public_id;

  await user.save();
  return { _id: userId, image: user.image };
};

export const editUserService = async (userId, body) => {
  const { name, email, mobile } = body;
  const updated = await userModel.findByIdAndUpdate(userId, { name, email, mobile });
  return updated;
};

export const emailChangeOtpService = async (userId, email) => {
  const isExist = await userModel.findOne({ email });
  if (isExist) {
    throw new AppError('User already exist in this email address', STATUS_CODES.NOT_FOUND);
  }
  const user = await userModel.findById(userId);
  const userOtp = await OtpModel.findOne({ userId });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  if (userOtp) {
    userOtp.otp = otp;
    userOtp.otp_expiry = Date.now() + 60000;
    await userOtp.save();
  } else {
    await OtpModel.create({
      userId: user._id,
      otp: otp,
      otp_expiry: Date.now() + 60000,
    });
  }
  await sendEmail({
    to: email,
    subject: 'Verification mail from Zayn Collection',
    text: `Your OTP is ${otp}`,
    html: verifyMailTemplate(`${user.firstName} ${user.lastName}`, otp),
  });
};

export const emailChangeResendOtpService = async (email, userId) => {
  const user = await userModel.findById(userId);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const userOtp = await OtpModel.findOne({ userId });
  if (userOtp) {
    userOtp.otp = otp;
    userOtp.otp_expiry = Date.now() + 60000;
    await userOtp.save();
  } else {
    await OtpModel.create({
      userId: user._id,
      otp: otp,
      otp_expiry: Date.now() + 60000,
    });
  }
  await sendEmail({
    to: email,
    subject: 'Verification mail from Zayn Collection',
    text: `Your OTP is ${otp}`,
    html: verifyMailTemplate(`${user.firstName} ${user.lastName}`, otp),
  });
};

export const emailChangeVerifyService = async (userId, otp) => {
  let userOtp = await OtpModel.findOne({ userId });
  const isCodeValid = userOtp.otp == otp;
  const isNotExpired = userOtp.otp_expiry > new Date();
  if (!isCodeValid) {
    throw new AppError('Invalid OTP', STATUS_CODES.BAD_REQUEST);
  } else if (!isNotExpired) {
    throw new AppError('OTP expired', STATUS_CODES.BAD_REQUEST);
  }
  return true;
};

export const getUserChartDataService = async (query) => {
  const { type = 'daily', startDate, endDate, year, month } = query;
  const now = new Date();
  const firstDayOfWeek = new Date(now);
  let start, end;
  let day = (now.getDay() + 6) % 7;
  firstDayOfWeek.setDate(now.getDate() - day);

  const lastDayOfTheWeek = new Date(firstDayOfWeek);
  lastDayOfTheWeek.setDate(firstDayOfWeek.getDate() + 6);
  switch (type) {
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'weekly':
      start = firstDayOfWeek;
      end = lastDayOfTheWeek;
      break;
    case 'monthly':
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
      break;
    case 'yearly':
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
      break;
    case 'custom':
      start = new Date(startDate);
      end = new Date(endDate);
      break;
  }
  const data = await userModel.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id:
          type === 'yearly'
            ? { $month: '$createdAt' }
            : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const map = new Map(data.map((i) => [i._id, i.total]));
  const filled = [];
  if (type === 'yearly') {
    for (let m = 1; m <= 12; m++) {
      filled.push({
        name: new Date(2025, m - 1, 1).toLocaleString('default', {
          month: 'short',
        }),
        users: map.get(m) || 0,
      });
    }
  } else if (type === 'daily') {
    const key = new Date().toISOString().slice(0, 10);
    filled.push({
      name: `${new Date().getDate()} ${new Date().toLocaleString('default', {
        month: 'short',
      })}`,
      users: map.get(key) || 0,
    });
  } else {
    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      filled.push({
        name: `${current.getDate()} ${current.toLocaleString('default', {
          month: 'short',
        })}`,
        users: map.get(key) || 0,
      });
      current.setDate(current.getDate() + 1);
    }
  }
  console.log(filled);
  return filled;
};
