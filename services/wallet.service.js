import walletModel from '../models/wallet.model.js';
import walletTransactionsModel from '../models/walletTransactions.model.js';

export const getWalletService = async (userId) => {
  const wallet = await walletModel.findOne({ userId });
  return wallet;
};

export const getWalletTransactionsService = async (userId, page, perPage) => {
  const totalPosts = await walletTransactionsModel.countDocuments({ userId });
  const transactions = await walletTransactionsModel
    .find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage);
  console.log(transactions);
  const totalPages = Math.ceil(totalPosts / perPage);
  return { transactions, totalPosts, totalPages };
};
