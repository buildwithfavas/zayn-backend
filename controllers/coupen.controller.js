import {
  addCouponService,
  applyCouponService,
  editCouponService,
  getCouponForUserService,
  getCouponService,
  removeAppliedCouponService,
  toggleCouponStatusService,
} from '../services/coupen.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const addCouponController = async (req, res) => {
  const coupon = await addCouponService(req.body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    coupon,
  });
};

const getCouponsController = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const { coupons, totalPosts } = await getCouponService(page, perPage);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    coupons,
    totalPosts,
    page,
    perPage,
  });
};

const editCouponController = async (req, res) => {
  const coupon = await editCouponService(req.body, req.params.id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    coupon,
  });
};

const toggleCouponStatusController = async (req, res) => {
  const coupon = await toggleCouponStatusService(req.params.id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    coupon,
  });
};

const getCouponForUserController = async (req, res) => {
  const purchaseValue = parseInt(req.query.purchaseValue);
  const coupons = await getCouponForUserService(purchaseValue, req.userId);
  console.log(coupons);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    coupons,
  });
};

const applyCouponController = async (req, res) => {
  const { coupon, items, couponDeduction } = await applyCouponService(req.body, req.userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    coupon,
    items,
    couponDeduction,
  });
};

const removeAppliedCouponController = async (req, res) => {
  const items = await removeAppliedCouponService(req.body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    items,
  });
};

export {
  addCouponController,
  getCouponsController,
  editCouponController,
  toggleCouponStatusController,
  getCouponForUserController,
  applyCouponController,
  removeAppliedCouponController,
};
