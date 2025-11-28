import walletModel from '../models/wallet.model.js';
import walletTransactionsModel from '../models/walletTransactions.model.js';
import { getWalletService, getWalletTransactionsService } from '../services/wallet.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import crypto from 'crypto';

export const addMoneyToWalletController = async (req, res) => {
  const userId = req.userId;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res
      .status(STATUS_CODES.NOT_FOUND)
      .json({ success: false, message: 'Missing payment fields' });
  }
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_TEST_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generated_signature == razorpay_signature) {
    const transaction = await walletTransactionsModel.create({
      userId,
      type: 'CREDIT',
      amount: amount,
      transactionId: razorpay_payment_id,
      balanceAfter: 0,
      description: 'Added To Wallet',
    });
    const wallet = await walletModel.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount }, $push: { history: transaction._id } },
      { upsert: true, new: true }
    );
    transaction.balanceAfter = wallet.balance;
    await transaction.save();
  }
  return res.status(STATUS_CODES.OK).json({ success: true, message: 'Payment Successful' });
};

export const getWalletController = async (req, res) => {
  const userId = req.userId;
  const wallet = await getWalletService(userId);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    wallet,
  });
};

export const getWalletTransactions = async (req, res) => {
  const userId = req.userId;
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const { transactions, totalPosts, totalPages } = await getWalletTransactionsService(
    userId,
    page,
    perPage
  );
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    transactions,
    totalPosts,
    page,
    perPage,
    totalPages,
  });
};
