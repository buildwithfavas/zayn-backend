import sendEmail from '../config/emailService.js';
import { getIO, onlineUsers } from '../config/socketIo.js';
import userModel from '../models/user.model.js';
import accountBlockedMailTemplate from '../utils/templates/blockUserTemplate.js';
import { getSignedImageUrl } from '../utils/getImageFromCloudinary.js';
import accountUnblockedMailTemplate from '../utils/templates/unblockEmailTemplate.js';

export const getUsersService = async (query) => {
  const page = query.page;
  const perPage = query.perPage;
  let filter = {};

  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }
  const totalPosts = await userModel.countDocuments(filter);
  const users = await userModel
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(perPage * (page - 1))
    .limit(perPage);

  const allUsers = users.map((user) => {
    let obj = user.toObject();
    if (user.googleId && user.image.includes('googleusercontent')) {
      obj.image = obj.image || null;
    } else if (user.appleId && !user.image) {
      obj.image = null; // Apple doesn't provide a public profile image URL easily like FB/Google
    } else {
      obj.image = user.image ? getSignedImageUrl(user.image) : null;
    }
    return obj;
  });
  return { allUsers, totalPosts };
};

export const blockUserService = async (userId) => {
  const user = await userModel.findByIdAndUpdate(
    userId,
    [{ $set: { isBlocked: { $not: '$isBlocked' } } }],
    { new: true }
  );
  if (user.isBlocked) {
    await sendEmail({
      to: user.email,
      subject: 'Verification mail from Zayn Collection',
      text: `User Blocked`,
      html: accountBlockedMailTemplate(`${user.firstName} ${user.lastName}`),
    });
  }
  if (!user.isBlocked) {
    await sendEmail({
      to: user.email,
      subject: 'Verification mail from Zayn Collection',
      text: `User unblocked`,
      html: accountUnblockedMailTemplate(`${user.firstName} ${user.lastName}`),
    });
  }
  const socketId = onlineUsers.get(userId);
  if (socketId) {
    getIO().to(socketId).emit('forceLogout', 'You have been blocked by admin.');
  }
  return user;
};
