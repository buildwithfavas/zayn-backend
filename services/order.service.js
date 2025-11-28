import mongoose from 'mongoose';
import AppError from '../middlewares/Error/appError.js';
import cartModel from '../models/cart.mode.js';
import orderModel from '../models/orders.model.js';
import productModel from '../models/product.model.js';
import variantModel from '../models/variant.schema.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import reviewModel from '../models/reveiw.model.js';
import wishlistModal from '../models/wishlist.model.js';
import walletModel from '../models/wallet.model.js';
import walletTransactionsModel from '../models/walletTransactions.model.js';
import PDFDocument from 'pdfkit';

export const placeOrderService = async (userId, body) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { items, address, prices, payment, coupon, filed = false } = body;

    for (let item of items) {
      const product = await productModel
        .findById(item.product._id)
        .populate('categoryId')
        .populate('subCategoryId')
        .populate('thirdSubCategoryId')
        .session(session);
      const variant = await variantModel.findById(item.variant._id).session(session);

      if (
        product.isUnlisted ||
        variant.isUnlisted ||
        product.categoryId.isBlocked ||
        product.subCategoryId.isBlocked ||
        product.thirdSubCategoryId.isBlocked
      ) {
        throw new AppError(`${item.product.name} is not available now`, STATUS_CODES.BAD_REQUEST);
      }
      if (variant.stock <= 0 || variant.stock < item.quantity) {
        throw new AppError(`${item.product.name} is out of stock`, STATUS_CODES.BAD_REQUEST);
      }
    }

    const newOrder = new orderModel({ userId, items: [] });

    for (let item of items) {
      newOrder.items.push({
        product: item.product._id,
        variant: item.variant._id,
        name: item.product.name,
        image: item.variant.images[0],
        price: item.variant.price,
        oldPrice: item.variant.oldPrice,
        quantity: item.quantity,
        size: item.variant.size,
        color: item.variant.color,
        status: payment.status == 'Failed' ? 'Failed' : 'Confirmed',
      });
    }
    newOrder.shippingAddress = { ...address };
    newOrder.payment = payment;
    newOrder.prices = prices;
    if (coupon) {
      newOrder.coupon = {
        code: coupon.code,
        deduction: coupon.deduction,
      };
    }
    await newOrder.save({ session });

    if (!filed) {
      for (let item of items) {
        await variantModel.findByIdAndUpdate(
          item.variant._id,
          { $inc: { stock: -item.quantity } },
          { session }
        );

        await cartModel.findOneAndDelete(
          { userId, product: item.product._id, variant: item.variant._id },
          { session }
        );
        await wishlistModal.findOneAndDelete({
          user: userId,
          product: item.product._id,
          variant: item.variant._id,
        });
      }
    }
    await session.commitTransaction();
    return newOrder;
  } catch (error) {
    await session.abortTransaction();
    throw new AppError(error.message, STATUS_CODES.INTERNAL_SERVER_ERROR);
  } finally {
    session.endSession();
  }
};

export const getOrdersService = async (userId, page, perPage) => {
  const result = await orderModel.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$items' },
    {
      $facet: {
        data: [{ $sort: { createdAt: -1 } }, { $skip: (page - 1) * perPage }, { $limit: perPage }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);
  const orders = result[0].data;
  const totalPosts = result[0]?.totalCount[0]?.count;
  const totalPages = Math.ceil(totalPosts / perPage);
  return { orders, totalPages, totalPosts };
};

export const getOrderItemByIdService = async (id) => {
  const order = await orderModel
    .findOne(
      {
        'items._id': id,
      },
      { orderId: 1, shippingAddress: 1, payment: 1, items: 1, createdAt: 1 }
    )
    .populate('items.product');
  const displayItem = order.items.filter((e) => e._id.toString() == id)[0];
  const relatedItems = order.items.filter((e) => e._id.toString() != id);
  return { order, displayItem, relatedItems };
};

export const downloadInvoiceService = async (id, res) => {
  const order = await orderModel.findOne(
    { 'items._id': id },
    {
      'items.$': 1,
      orderId: 1,
      shippingAddress: 1,
      payment: 1,
      createdAt: 1,
      prices: 1,
    }
  );

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const item = order.items[0];
  const discount = item.oldPrice * item.quantity - item.price * item.quantity;

  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);

  doc.pipe(res);

  const formatCurrency = (amount) => {
    return `Rs.${Number(amount || 0)
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  doc.fontSize(24).font('Helvetica-Bold').fillColor('#000000').text('INVOICE', 50, 50);

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666666')
    .text('Shopping cart', 50, 80)
    .text('shoppingCart@gmail.com', 50, 119);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text(`Invoice #${order.orderId}`, 400, 50, { align: 'right' });

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#666666')
    .text(`Date: ${formatDate(order.createdAt)}`, 400, 70, { align: 'right' })
    .text(`Payment: ${order.payment.method}`, 400, 85, { align: 'right' });

  doc.strokeColor('#000000').lineWidth(1).moveTo(50, 150).lineTo(545, 150).stroke();

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('BILL TO:', 50, 170);

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333333')
    .text(order.shippingAddress.name, 50, 190)
    .text(order.shippingAddress.address_line, 50, 205, { width: 250 })
    .text(`${order.shippingAddress.locality}, ${order.shippingAddress.city}`, 50, 220)
    .text(`${order.shippingAddress.state} - ${order.shippingAddress.pin_code}`, 50, 235)
    .text(`Phone: ${order.shippingAddress.mobile}`, 50, 250);

  const tableTop = 300;
  doc.strokeColor('#000000').lineWidth(1).moveTo(50, tableTop).lineTo(545, tableTop).stroke();

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('DESCRIPTION', 50, tableTop + 10)
    .text('QTY', 320, tableTop + 10, { width: 50, align: 'right' })
    .text('UNIT PRICE', 380, tableTop + 10, { width: 70, align: 'right' })
    .text('AMOUNT', 460, tableTop + 10, { width: 85, align: 'right' });

  doc
    .strokeColor('#000000')
    .lineWidth(1)
    .moveTo(50, tableTop + 30)
    .lineTo(545, tableTop + 30)
    .stroke();

  const itemY = tableTop + 40;
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333333')
    .text(item.name, 50, itemY, { width: 250 });

  if (item.size || item.color) {
    const variant = [item.size, item.color].filter(Boolean).join(', ');
    doc
      .fontSize(8)
      .fillColor('#666666')
      .text(variant, 50, itemY + 15, { width: 250 });
  }

  doc
    .fontSize(10)
    .fillColor('#333333')
    .text(item.quantity.toString(), 320, itemY, { width: 50, align: 'right' })
    .text(formatCurrency(item.price), 380, itemY, { width: 70, align: 'right' })
    .text(formatCurrency(item.price * item.quantity), 460, itemY, { width: 85, align: 'right' });

  const summaryTop = itemY + 60;
  doc
    .strokeColor('#000000')
    .lineWidth(0.5)
    .moveTo(350, summaryTop)
    .lineTo(545, summaryTop)
    .stroke();

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333333')
    .text('Subtotal:', 350, summaryTop + 15)
    .text(formatCurrency(item.oldPrice * item.quantity), 460, summaryTop + 15, {
      width: 85,
      align: 'right',
    });

  if (discount > 0) {
    doc
      .text('Discount:', 350, summaryTop + 35)
      .text(`-${formatCurrency(discount)}`, 460, summaryTop + 35, {
        width: 85,
        align: 'right',
      });
  }

  doc
    .strokeColor('#000000')
    .lineWidth(1)
    .moveTo(350, summaryTop + 55)
    .lineTo(545, summaryTop + 55)
    .stroke();

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Total:', 350, summaryTop + 65)
    .text(formatCurrency(item.price * item.quantity), 460, summaryTop + 65, {
      width: 85,
      align: 'right',
    });

  doc
    .strokeColor('#000000')
    .lineWidth(1)
    .moveTo(350, summaryTop + 90)
    .lineTo(545, summaryTop + 90)
    .stroke();

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#666666')
    .text('Thank you for your business.', 50, 700, { align: 'center', width: 495 });

  doc.end();
};
export const getAdminOrdersService = async (page, perPage, query) => {
  const filter = {};
  if (query.search) {
    filter.$or = [
      { orderId: { $regex: query.search, $options: 'i' } },
      { 'user.name': { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.status) {
    filter.orderStatus = query.status;
  }
  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $match: filter,
    },
  ];

  if (query.sortBy == 'Amount:Low To High') {
    pipeline.push({ $sort: { 'prices.total': 1 } });
  } else if (query.sortBy == 'Amount:High To Low') {
    pipeline.push({ $sort: { 'prices.total': -1 } });
  } else if (query.sortBy == 'Date:Newest First') {
    pipeline.push({ $sort: { createdAt: -1 } });
  } else if (query.sortBy == 'Date:Oldest First') {
    pipeline.push({ $sort: { createdAt: 1 } });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }
  pipeline.push({
    $facet: {
      data: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
      totalCount: [{ $count: 'count' }],
    },
  });

  const result = await orderModel.aggregate(pipeline);
  const orders = result[0]?.data || [];
  const totalPosts = result[0]?.totalCount[0]?.count || 0;
  return { orders, totalPosts };
};

export const getOrderItemsByOrderIdService = async (id) => {
  const order = await orderModel.findById(id).populate('items.product');
  return order;
};

export const getAdminOrdersByItemsService = async (query, page, perPage) => {
  const filter = {};
  if (query.search) {
    filter.$or = [
      { orderId: { $regex: query.search, $options: 'i' } },
      { 'user.name': { $regex: query.search, $options: 'i' } },
      { 'items.name': { $regex: query.search, $options: 'i' } },
      { 'category.name': { $regex: query.search, $options: 'i' } },
      { 'subCategory.name': { $regex: query.search, $options: 'i' } },
      { 'thirdCategory.name': { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.category) {
    filter['category.name'] = query.category[0];
  }
  if (query.subCategory) {
    filter['subCategory.name'] = query.subCategory[0];
  }
  if (query.thirdCategory) {
    filter['thirdCategory.name'] = query.thirdCategory[0];
  }
  console.log(query.status);
  if (query.status) {
    filter['items.status'] = query.status;
  }
  const pipeline = [
    {
      $unwind: '$items',
    },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.subCategoryId',
        foreignField: '_id',
        as: 'subCategory',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.thirdSubCategoryId',
        foreignField: '_id',
        as: 'thirdCategory',
      },
    },
    { $unwind: '$subCategory' },
    { $unwind: '$category' },
    { $unwind: '$thirdCategory' },
    { $match: filter },
  ];
  if (query.sortBy == 'Amount:Low To High') {
    pipeline.push({ $sort: { 'items.price': 1 } });
  } else if (query.sortBy == 'Amount:High To Low') {
    pipeline.push({ $sort: { 'items.price': -1 } });
  } else if (query.sortBy == 'Date:Newest First') {
    pipeline.push({ $sort: { createdAt: -1 } });
  } else if (query.sortBy == 'Date:Oldest First') {
    pipeline.push({ $sort: { createdAt: 1 } });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }
  pipeline.push({
    $facet: {
      data: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
      totalCount: [{ $count: 'count' }],
    },
  });
  const result = await orderModel.aggregate(pipeline);
  const orderItems = result[0]?.data || [];
  const totalPosts = result[0]?.totalCount[0]?.count || 0;
  return { orderItems, totalPosts };
};

export const updateOrderStatusService = async (id, status) => {
  const order = await orderModel.findOne({ 'items._id': id });

  const item = order.items.id(id);
  console.log(status, item.statusHistory);
  if (item.statusHistory.some((h) => h.status === status)) {
    throw new AppError('This order already has this status, please refresh the page');
  }
  item.status = status;
  if (item.status == 'Cancelled') {
    const wallet = await walletModel.findOne({ userId: order.userId });
    wallet.balance = wallet.balance + item.price * item.quantity;
    await wallet.save();
    await walletTransactionsModel.create({
      userId: order.userId,
      amount: item.price * item.quantity,
      description: 'Refund for order cancellation',
      type: 'CREDIT',
      relatedOrderId: order.orderId,
      balanceAfter: wallet.balance,
    });
    order.payment.status = 'Refunded';
    await order.save();
    await variantModel.findByIdAndUpdate(item.variant, {
      $inc: { stock: item.quantity },
    });
  }
  await order.save();
  return order;
};

export const cancelOrderByUserService = async (id, reason) => {
  const order = await orderModel.findOne({ 'items._id': id });
  const item = order.items.id(id);

  item.status = 'Cancelled';
  item.cancelReason = reason;
  await order.save();
  if (order.payment.method == 'Wallet' || order.payment.method == 'Online') {
    const wallet = await walletModel.findOne({ userId: order.userId });
    wallet.balance = wallet.balance + item.price * item.quantity;
    await wallet.save();
    await walletTransactionsModel.create({
      userId: order.userId,
      amount: item.price * item.quantity,
      description: 'Refund for order cancellation',
      type: 'CREDIT',
      relatedOrderId: order.orderId,
      balanceAfter: wallet.balance,
    });
    order.payment.status = 'Refunded';
    await order.save();
  }
  await variantModel.findByIdAndUpdate(item.variant, {
    $inc: { stock: item.quantity },
  });
  return order;
};

export const returnRequestService = async (id, reason) => {
  const order = await orderModel.findOne({ 'items._id': id });
  const item = order.items.id(id);
  item.status = 'Return Requested';
  item.returnReason = reason;
  await order.save();
  return order;
};

export const approveReturnRequest = async (id) => {
  const order = await orderModel.findOne({ 'items._id': id });
  const item = order.items.id(id);
  item.status = 'Return Approved';
  if (order.payment.method == 'Wallet' || order.payment.method == 'Online') {
    const wallet = await walletModel.findOne({ userId: order.userId });
    wallet.balance = wallet.balance + item.price * item.quantity;
    await wallet.save();
    await walletTransactionsModel.create({
      userId: order.userId,
      amount: item.price * item.quantity,
      description: 'Refund for order return',
      type: 'CREDIT',
      relatedOrderId: order.orderId,
      balanceAfter: wallet.balance,
    });
    order.payment.status = 'Refunded';
  }
  await order.save();
  await variantModel.findByIdAndUpdate(item.variant, {
    $inc: { stock: item.quantity },
  });
  return order;
};
export const rejectReturnRequest = async (id) => {
  const order = await orderModel.findOne({ 'items._id': id });
  const item = order.items.id(id);
  item.status = 'Return Rejected';
  await order.save();
  return order;
};

export const getReturnRequests = async (page, perPage, query) => {
  const filter = {};
  if (query.search) {
    filter.$or = [
      { orderId: { $regex: query.search, $options: 'i' } },
      { 'user.name': { $regex: query.search, $options: 'i' } },
      { 'items.name': { $regex: query.search, $options: 'i' } },
    ];
  }
  const result = await orderModel.aggregate([
    { $unwind: '$items' },
    { $match: { 'items.status': 'Return Requested' } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: filter },
    {
      $facet: {
        data: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
        totalPosts: [{ $count: 'count' }],
      },
    },
  ]);
  const orders = result[0].data || [];
  const totalPosts = result[0]?.totalPosts[0]?.count || 0;
  return { orders, totalPosts };
};

export const AddReviewService = async (userId, id, body) => {
  const order = await orderModel.findOne({ 'items._id': id });
  const item = order.items.id(id);

  const review = await reviewModel.create({
    user: userId,
    product: item.product,
    rating: body.rating,
    review: body.review,
  });
  const status = await reviewModel.aggregate([
    { $match: { product: item.product } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  item.review = {
    comment: body.review,
    rating: body.rating,
  };
  await order.save();
  await productModel.findByIdAndUpdate(item.product, {
    $set: { rating: status[0].avg, reviewCount: status[0].count },
  });
  return review;
};

export const getReviewsService = async (id) => {
  const reviews = await reviewModel.find({ product: id }).populate('user');
  return reviews;
};

export const getSalesReportService = async (filter, startDate, endDate, year, month) => {
  const match = {};
  const now = new Date();
  const firstDayOfWeek = new Date(now);
  let day = (now.getDay() + 6) % 7;
  firstDayOfWeek.setDate(now.getDate() - day);
  const lastDayOfTheWeek = new Date(firstDayOfWeek);
  lastDayOfTheWeek.setDate(firstDayOfWeek.getDate() + 6);
  switch (filter) {
    case 'daily':
      match.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
      break;
    case 'weekly':
      match.createdAt = {
        $gte: firstDayOfWeek,
        $lte: lastDayOfTheWeek,
      };
      break;
    case 'monthly':
      match.createdAt = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 1),
      };
      break;
    case 'yearly':
      match.createdAt = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year + 1, 0, 1),
      };
      break;
    case 'custom':
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      break;
  }
  const result = await orderModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$prices.subtotal' },
        totalDiscount: { $sum: '$prices.discount' },
        totalPrice: { $sum: '$prices.total' },
        salesCount: { $sum: 1 },
        couponDeduction: { $sum: '$coupon.deduction' },
      },
    },
  ]);

  const orders = await orderModel.aggregate([{ $match: match }, { $unwind: '$items' }]);
  let cancelCount = 0;
  let returnCount = 0;
  let cancelSum = 0;
  let returnSum = 0;
  orders.forEach((order) => {
    if (order.items.status == 'Cancelled') {
      cancelCount++;
      cancelSum += order.items.price;
    } else if (order.items.status == 'Return Approved') {
      returnCount++;
      returnSum += order.items.price;
    }
  });
  const totalRevenue = result[0]?.totalPrice - (cancelSum + returnSum) || 0;
  return {
    totalAmount: result[0]?.totalAmount || 0,
    totalDiscount: result[0]?.totalDiscount || 0,
    totalPrice: result[0]?.totalPrice || 0,
    salesCount: result[0]?.salesCount || 0,
    couponDeduction: result[0]?.couponDeduction || 0,
    cancelCount,
    cancelSum,
    returnCount,
    returnSum,
    totalRevenue,
  };
};

export const getSalesReportOrdersService = async (filter, startDate, endDate, year, month) => {
  const match = { orderStatus: { $ne: 'Failed' } };
  const now = new Date();
  const firstDayOfWeek = new Date(now);
  let day = (now.getDay() + 6) % 7;
  firstDayOfWeek.setDate(now.getDate() - day);
  const lastDayOfTheWeek = new Date(firstDayOfWeek);
  lastDayOfTheWeek.setDate(firstDayOfWeek.getDate() + 6);
  switch (filter) {
    case 'daily':
      match.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
      break;
    case 'weekly':
      match.createdAt = {
        $gte: firstDayOfWeek,
        $lte: lastDayOfTheWeek,
      };
      break;
    case 'monthly':
      match.createdAt = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 1),
      };
      break;
    case 'yearly':
      match.createdAt = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year + 1, 0, 1),
      };
      break;
    case 'custom':
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      break;
  }
  const result = await orderModel.aggregate([{ $match: match }]);

  return result;
};

export const orderWithWalletService = async (userId, body) => {
  const amount = body.prices.total;
  const items = body.items;
  for (let item of items) {
    const product = await productModel
      .findById(item.product._id)
      .populate('categoryId')
      .populate('subCategoryId')
      .populate('thirdSubCategoryId');
    const variant = await variantModel.findById(item.variant._id);

    if (
      product.isUnlisted ||
      variant.isUnlisted ||
      product.categoryId.isBlocked ||
      product.subCategoryId.isBlocked ||
      product.thirdSubCategoryId.isBlocked
    ) {
      throw new AppError(`${item.product.name} is not available now`, STATUS_CODES.BAD_REQUEST);
    }
    if (variant.stock <= 0 || variant.stock < item.quantity) {
      throw new AppError(`${item.product.name} is out of stock`, STATUS_CODES.BAD_REQUEST);
    }
  }
  const wallet = await walletModel.findOne({ userId });
  if (wallet.balance < amount) {
    throw new AppError('Insufficient balance in wallet');
  }
  wallet.balance = wallet.balance - amount;
  await wallet.save();
  const transaction = await walletTransactionsModel.create({
    userId,
    amount,
    type: 'DEBIT',
    description: 'Payment for order',
    balanceAfter: wallet.balance,
  });

  const order = await placeOrderService(userId, {
    ...body,
    payment: { method: 'Wallet', status: 'Paid', transactionId: transaction._id },
  });
  return order;
};

export const getFailedOrderService = async (id) => {
  const order = await orderModel.findById(id);
  return order;
};

export const retryFailedOrderService = async (userId, id, payment) => {
  const order = await orderModel.findById(id);

  for (let item of order.items) {
    const product = await productModel
      .findById(item.product)
      .populate('categoryId')
      .populate('subCategoryId')
      .populate('thirdSubCategoryId');
    const variant = await variantModel.findById(item.variant);
    if (
      product.isUnlisted ||
      variant.isUnlisted ||
      product.categoryId.isBlocked ||
      product.subCategoryId.isBlocked ||
      product.thirdSubCategoryId.isBlocked
    ) {
      throw new AppError(`${product.name} is not available now`, STATUS_CODES.BAD_REQUEST);
    }
    if (variant.stock <= 0 || variant.stock < item.quantity) {
      throw new AppError(`${product.name} is out of stock`, STATUS_CODES.BAD_REQUEST);
    }
    item.status = 'Confirmed';

    await variantModel.findByIdAndUpdate(item.variant, { $inc: { stock: -item.quantity } });

    await cartModel.findOneAndDelete({ userId, product: item.product, variant: item.variant });
    await wishlistModal.findOneAndDelete({
      user: userId,
      product: item.product,
      variant: item.variant,
    });
  }

  order.payment = payment;
  await order.save();
  return order;
};

export const retryFailedOrderWithWalletService = async (userId, body) => {
  const { id, amount, items } = body;
  const wallet = await walletModel.findOne({ userId });
  if (wallet.balance < amount) {
    throw new AppError('Insufficient balance in wallet');
  }

  for (let item of items) {
    const product = await productModel
      .findById(item.product)
      .populate('categoryId')
      .populate('subCategoryId')
      .populate('thirdSubCategoryId');
    const variant = await variantModel.findById(item.variant);

    if (
      product.isUnlisted ||
      variant.isUnlisted ||
      product.categoryId.isBlocked ||
      product.subCategoryId.isBlocked ||
      product.thirdSubCategoryId.isBlocked
    ) {
      throw new AppError(`${product.name} is not available now`, STATUS_CODES.BAD_REQUEST);
    }
    if (variant.stock <= 0 || variant.stock < item.quantity) {
      throw new AppError(`${product.name} is out of stock`, STATUS_CODES.BAD_REQUEST);
    }
  }
  wallet.balance = wallet.balance - amount;
  await wallet.save();
  const transaction = await walletTransactionsModel.create({
    userId,
    amount,
    type: 'DEBIT',
    description: 'Payment for order',
    balanceAfter: wallet.balance,
  });
  const order = await retryFailedOrderService(userId, id, {
    method: 'Wallet',
    status: 'Paid',
    transactionId: transaction._id,
  });
  return order;
};

export const getTopSellingProductsService = async (
  page,
  perPage,
  filter,
  startDate,
  endDate,
  year,
  month
) => {
  const match = {};
  const now = new Date();
  const firstDayOfWeek = new Date(now);
  let day = (now.getDay() + 6) % 7;
  firstDayOfWeek.setDate(now.getDate() - day);
  const lastDayOfTheWeek = new Date(firstDayOfWeek);
  lastDayOfTheWeek.setDate(firstDayOfWeek.getDate() + 6);
  switch (filter) {
    case 'daily':
      match.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
      break;
    case 'weekly':
      match.createdAt = {
        $gte: firstDayOfWeek,
        $lte: lastDayOfTheWeek,
      };
      break;
    case 'monthly':
      match.createdAt = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 1),
      };
      break;
    case 'yearly':
      match.createdAt = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year + 1, 0, 1),
      };
      break;
    case 'custom':
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      break;
  }
  const result = await orderModel.aggregate([
    { $match: match },
    {
      $unwind: '$items',
    },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$items.name',
        count: { $sum: '$items.quantity' },
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$items.price' },
        category: { $first: '$category.name' },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $facet: {
        data: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
        totalPosts: [{ $count: 'count' }],
      },
    },
  ]);
  const products = result[0].data || null;
  const totalPosts = result[0].totalPosts[0]?.count || 0;
  return { products, totalPosts };
};

export const getTopSellingCategoriesService = async (
  page,
  perPage,
  filter,
  startDate,
  endDate,
  year,
  month
) => {
  const match = {};
  const now = new Date();
  const firstDayOfWeek = new Date(now);
  let day = (now.getDay() + 6) % 7;
  firstDayOfWeek.setDate(now.getDate() - day);
  const lastDayOfTheWeek = new Date(firstDayOfWeek);
  lastDayOfTheWeek.setDate(firstDayOfWeek.getDate() + 6);
  switch (filter) {
    case 'daily':
      match.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
      break;
    case 'weekly':
      match.createdAt = {
        $gte: firstDayOfWeek,
        $lte: lastDayOfTheWeek,
      };
      break;
    case 'monthly':
      match.createdAt = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 1),
      };
      break;
    case 'yearly':
      match.createdAt = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year + 1, 0, 1),
      };
      break;
    case 'custom':
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      break;
  }
  const result = await orderModel.aggregate([
    { $match: match },
    {
      $unwind: '$items',
    },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category.name',
        count: { $sum: '$items.quantity' },
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$items.price' },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $facet: {
        data: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
        totalPosts: [{ $count: 'count' }],
      },
    },
  ]);
  const categories = result[0].data || null;
  const totalPosts = result[0].totalPosts[0]?.count || 0;
  return { categories, totalPosts };
};

export const getTopSellingBrandsService = async (
  page,
  perPage,
  filter,
  startDate,
  endDate,
  year,
  month
) => {
  const match = {};
  const now = new Date();
  const firstDayOfWeek = new Date(now);
  let day = (now.getDay() + 6) % 7;
  firstDayOfWeek.setDate(now.getDate() - day);
  const lastDayOfTheWeek = new Date(firstDayOfWeek);
  lastDayOfTheWeek.setDate(firstDayOfWeek.getDate() + 6);
  switch (filter) {
    case 'daily':
      match.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
      break;
    case 'weekly':
      match.createdAt = {
        $gte: firstDayOfWeek,
        $lte: lastDayOfTheWeek,
      };
      break;
    case 'monthly':
      match.createdAt = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 1),
      };
      break;
    case 'yearly':
      match.createdAt = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year + 1, 0, 1),
      };
      break;
    case 'custom':
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      break;
  }
  const result = await orderModel.aggregate([
    { $match: match },
    {
      $unwind: '$items',
    },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.brand',
        count: { $sum: '$items.quantity' },
        orderCount: { $sum: 1 },
        totalRevenue: { $sum: '$items.price' },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $facet: {
        data: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
        totalPosts: [{ $count: 'count' }],
      },
    },
  ]);
  const brands = result[0].data || null;
  const totalPosts = result[0].totalPosts[0]?.count || 0;
  console.log(brands);
  return { brands, totalPosts };
};

export const getRevenueChartDataService = async (query) => {
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
  const data = await orderModel.aggregate([
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
        total: { $sum: '$prices.total' },
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
        total: map.get(m) || 0,
      });
    }
  } else if (type === 'daily') {
    const key = new Date().toISOString().slice(0, 10);
    filled.push({
      name: `${new Date().getDate()} ${new Date().toLocaleString('default', {
        month: 'short',
      })}`,
      total: map.get(key) || 0,
    });
  } else {
    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      filled.push({
        name: `${current.getDate()} ${current.toLocaleString('default', {
          month: 'short',
        })}`,
        total: map.get(key) || 0,
      });
      current.setDate(current.getDate() + 1);
    }
  }
  return filled;
};

export const getSalesChartDataService = async (query) => {
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
  const data = await orderModel.aggregate([
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
        total: map.get(m) || 0,
      });
    }
  } else if (type === 'daily') {
    const key = new Date().toISOString().slice(0, 10);
    filled.push({
      name: `${new Date().getDate()} ${new Date().toLocaleString('default', {
        month: 'short',
      })}`,
      total: map.get(key) || 0,
    });
  } else {
    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      filled.push({
        name: `${current.getDate()} ${current.toLocaleString('default', {
          month: 'short',
        })}`,
        total: map.get(key) || 0,
      });
      current.setDate(current.getDate() + 1);
    }
  }
  return filled;
};

export const getOrdersStatusChartDataService = async (query) => {
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
  const data = await orderModel.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $unwind: '$items',
    },
    {
      $group: {
        _id: '$items.status',
        total: { $sum: 1 },
      },
    },
  ]);
  const itemStatuses = [
    'Confirmed',
    'Processing',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Return Requested',
    'Return Approved',
    'Return Rejected',
    'Cancelled',
  ];
  const map = new Map(data.map((i) => [i._id, i.total]));
  const filled = [];
  for (let m of itemStatuses) {
    if (map.get(m)) {
      filled.push({
        name: m,
        total: map.get(m) || 0,
      });
    }
  }
  return filled;
};
