import mongoose from 'mongoose';
import AppError from '../middlewares/Error/appError.js';
import couponModel from '../models/coupon.model.js';
import orderModel from '../models/orders.model.js';
import variantModel from '../models/variant.schema.js';
import { applyBestOffer } from '../utils/applyBestOffer.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const addCouponService = async (body) => {
  const exist = await couponModel.find({ code: body.code });
  if (exist.length > 0) {
    throw new AppError('Already a coupon exist in this code');
  }
  const coupon = await couponModel.create(body);
  return coupon;
};
export const getCouponService = async (page, perPage) => {
  const totalPosts = await couponModel.countDocuments();
  const coupons = await couponModel
    .find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage);
  return { coupons, totalPosts };
};

export const editCouponService = async (body, id) => {
  const exist = await couponModel.find({ code: body.code });
  const c = await couponModel.findById(id);
  if (exist.length && body.code != c.code) {
    throw new AppError('Already a coupon exist in this code');
  }
  const coupon = await couponModel.findByIdAndUpdate(id, { $set: body });
  return coupon;
};

export const toggleCouponStatusService = async (id) => {
  const coupon = await couponModel.findByIdAndUpdate(
    id,
    [{ $set: { isActive: { $not: '$isActive' } } }],
    { new: true }
  );
  return coupon;
};

export const getCouponForUserService = async (purchaseValue, userId) => {
  const hasOrders = await orderModel.exists({ userId });
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const baseFilter = {
    minPurchaseAmount: { $lte: purchaseValue },
    startDate: { $lte: now },
    expiryDate: { $gte: now },
    isActive: true,
    $expr: { $lt: ['$usedCount', '$usageLimit'] },
  };
  const scopeFilter = hasOrders
    ? {
        $or: [{ scope: 'Global' }, { scope: 'User', allowedUsers: { $in: [objectUserId] } }],
      }
    : {
        $or: [
          { scope: 'Global' },
          { scope: 'First Order' },
          { scope: 'User', allowedUsers: { $in: [objectUserId] } },
        ],
      };

  const coupons = await couponModel.find({
    ...baseFilter,
    ...scopeFilter,
  });

  return coupons;
};

export const applyCouponService = async ({ items, code, purchaseValue, userId }) => {
  const coupon = await couponModel.findOne({ code });
  if (!coupon) {
    throw new AppError('No Coupon Found in This Code', STATUS_CODES.NOT_FOUND);
  }
  if (coupon.expiryDate < new Date()) {
    throw new AppError('Coupon Expired', STATUS_CODES.BAD_REQUEST);
  }
  if (!coupon.isActive) {
    throw new AppError('Coupon is not active', STATUS_CODES.BAD_REQUEST);
  }
  if (purchaseValue < coupon.minPurchaseAmount) {
    throw new AppError(
      `Coupon is only applicable for purchases more than ${coupon.minPurchaseAmount}`,
      STATUS_CODES.BAD_REQUEST
    );
  }
  let couponDeduction = 0;
  let fullQuantity = 0;
  items.forEach((item) => {
    fullQuantity += item.quantity;
  });
  const itemsWithCoupon = items.map((item) => {
    if (coupon.discountType == 'Flat') {
      item.variant.price = item.variant.price - coupon.discountValue / fullQuantity;
      couponDeduction = coupon.discountValue;
    } else if (coupon.discountType == 'Percentage') {
      couponDeduction += Math.round(item.variant.price * (coupon.discountValue / 100));
      item.variant.price = Math.round(
        item.variant.price - item.variant.price * (coupon.discountValue / 100)
      );
    }
    return item;
  });
  coupon.usedCount = coupon.usedCount + 1;
  coupon.userUsage.push(userId);
  await coupon.save();
  return { items: itemsWithCoupon, coupon, couponDeduction };
};

export const removeAppliedCouponService = async ({ items, code }) => {
  const coupon = await couponModel.findOne({ code });
  const orderItems = await Promise.all(
    items.map(async (item) => {
      const baseVariant = await variantModel.findById(item.variant._id);
      const variant = await applyBestOffer(baseVariant);
      item.variant = variant;
      return item;
    })
  );
  coupon.usedCount = coupon.usedCount - 1;
  coupon.userUsage.pop();
  await coupon.save();
  return orderItems;
};
