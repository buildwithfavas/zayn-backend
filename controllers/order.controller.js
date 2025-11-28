import {
  AddReviewService,
  approveReturnRequest,
  cancelOrderByUserService,
  downloadInvoiceService,
  getAdminOrdersByItemsService,
  getAdminOrdersService,
  getFailedOrderService,
  getOrderItemByIdService,
  getOrderItemsByOrderIdService,
  getOrdersService,
  getOrdersStatusChartDataService,
  getReturnRequests,
  getRevenueChartDataService,
  getReviewsService,
  getSalesChartDataService,
  getSalesReportOrdersService,
  getSalesReportService,
  getTopSellingBrandsService,
  getTopSellingCategoriesService,
  getTopSellingProductsService,
  orderWithWalletService,
  placeOrderService,
  rejectReturnRequest,
  retryFailedOrderService,
  retryFailedOrderWithWalletService,
  returnRequestService,
  updateOrderStatusService,
} from '../services/order.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRazorpayOrderService } from '../services/product.service.js';
import paypal from 'paypal-rest-sdk';

paypal.configure({
  mode: 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

export const placeOrder = async (req, res) => {
  const userId = req.userId;
  const body = req.body;
  const order = await placeOrderService(userId, body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const getOrders = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const userId = req.userId;
  const { orders, totalPages, totalPosts } = await getOrdersService(userId, page, perPage);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    orders,
    page,
    perPage,
    totalPages,
    totalPosts,
  });
};

export const getOrderItemById = async (req, res) => {
  const id = req.params.id;
  const { order, displayItem, relatedItems } = await getOrderItemByIdService(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
    displayItem,
    relatedItems,
  });
};

export const downloadInvoice = async (req, res) => {
  const id = req.params.id;
  await downloadInvoiceService(id, res);
};

export const getAdminOrdersController = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const query = req.query;
  const { orders, totalPosts } = await getAdminOrdersService(page, perPage, query);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    orders,
    totalPosts,
    page,
    perPage,
  });
};

export const getOrderItemsByOrderId = async (req, res) => {
  const id = req.params.id;
  const order = await getOrderItemsByOrderIdService(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const updateOrderStatus = async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;
  const order = await updateOrderStatusService(id, status);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const getAdminOrdersByItems = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const { orderItems, totalPosts } = await getAdminOrdersByItemsService(req.query, page, perPage);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    orderItems,
    totalPosts,
    page,
    perPage,
  });
};

export const cancelOrderByUser = async (req, res) => {
  const id = req.params.id;
  const reason = req.body.reason;
  const order = await cancelOrderByUserService(id, reason);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const returnRequestController = async (req, res) => {
  const id = req.params.id;
  const reason = req.body.reason;
  const order = await returnRequestService(id, reason);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const approveReturnRequestController = async (req, res) => {
  const id = req.params.id;
  const order = await approveReturnRequest(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};
export const rejectReturnRequestController = async (req, res) => {
  const id = req.params.id;
  const order = await rejectReturnRequest(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const getReturnRequestsController = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const { orders, totalPosts } = await getReturnRequests(page, perPage, req.query);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    orders,
    totalPosts,
    page,
    perPage,
  });
};

export const AddReviewController = async (req, res) => {
  const userId = req.userId;
  const id = req.params.id;
  const product = await AddReviewService(userId, id, req.body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    product,
  });
};

export const getReviewsOController = async (req, res) => {
  const id = req.params.id;
  const reviews = await getReviewsService(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    reviews,
  });
};

export const getSalesReportController = async (req, res) => {
  const filter = req.query.type;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const year = req.query.year;
  const month = req.query.month;
  const {
    totalAmount,
    totalDiscount,
    totalPrice,
    salesCount,
    cancelCount,
    cancelSum,
    returnCount,
    returnSum,
    totalRevenue,
    couponDeduction,
  } = await getSalesReportService(filter, startDate, endDate, year, month);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    totalAmount,
    totalDiscount,
    totalPrice,
    salesCount,
    cancelCount,
    cancelSum,
    returnCount,
    returnSum,
    couponDeduction,
    totalRevenue,
  });
};

export const downloadSalesReportExcel = async (req, res) => {
  const { type, startDate, endDate, year, month } = req.query;
  const orders = await getSalesReportOrdersService(type, startDate, endDate, year, month);
  const reportData = await getSalesReportService(type, startDate, endDate, year, month);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  worksheet.mergeCells('A1', 'J1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Comprehensive Sales Report';
  titleCell.font = { size: 18, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  worksheet.addRow([]);
  worksheet.addRow(['Report Type', type || 'Overall']);
  worksheet.addRow(['Date Range', `${startDate || 'N/A'} - ${endDate || 'N/A'}`]);
  worksheet.addRow(['Generated On', new Date().toLocaleString()]);
  worksheet.addRow([]);
  worksheet.addRow([]);

  worksheet.addRow(['Sales Summary Overview']);
  const summaryHeaderRow = worksheet.addRow([
    'Total Orders',
    'Total Amount (₹)',
    'Total Discount (₹)',
    'Coupon Deduction (₹)',
    'Cancelled Orders',
    'Cancelled Value (₹)',
    'Returned Orders',
    'Returned Value (₹)',
    'Net Revenue (₹)',
  ]);

  summaryHeaderRow.font = { bold: true, size: 12 };
  summaryHeaderRow.alignment = { horizontal: 'center' };
  summaryHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  worksheet.addRow([
    reportData.salesCount || 0,
    reportData.totalAmount || 0,
    reportData.totalDiscount || 0,
    reportData.couponDeduction || 0,
    reportData.cancelCount || 0,
    reportData.cancelSum || 0,
    reportData.returnCount || 0,
    reportData.returnSum || 0,
    reportData.totalRevenue || 0,
  ]);

  worksheet.addRow([]);
  worksheet.addRow([]);

  const detailHeaderRow = worksheet.addRow([
    'Order ID',
    'Customer Name',
    'Order Date',
    'Payment Method',
    'Order Status',
    'Subtotal (₹)',
    'Discount (₹)',
    'Coupon Code',
    'Coupon Deduction (₹)',
    'Total Price (₹)',
    'Items Ordered',
  ]);

  detailHeaderRow.font = { bold: true, size: 12 };
  detailHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCE5FF' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  orders.forEach((order) => {
    const itemSummary = order.items
      .map(
        (i) =>
          `${i.name} (${i.size || '-'}, ${i.color || '-'}) x${i.quantity} = ₹${i.price * i.quantity}`
      )
      .join('\n');

    worksheet.addRow([
      order.orderId,
      order.shippingAddress?.name || 'N/A',
      new Date(order.createdAt).toLocaleDateString(),
      order.payment?.method || '-',
      order.orderStatus,
      order.prices?.subtotal || 0,
      order.prices?.discount || 0,
      order.coupon?.code || '-',
      order.prices?.couponDeduction || 0,
      order.prices?.total || 0,
      itemSummary,
    ]);
  });

  worksheet.columns.forEach((col, index) => {
    if (index === worksheet.columns.length - 1) {
      worksheet.getColumn(index + 1).alignment = { wrapText: true, vertical: 'top' };
      col.width = 60;
    } else {
      col.width = 18;
    }
  });

  worksheet.addRow([]);

  const filePath = path.join('uploads', `Sales_Report_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  res.download(filePath, 'Sales_Report.xlsx', (err) => {
    if (err) console.error(err);
    fs.unlinkSync(filePath);
  });
};

export const downloadSalesReportPDF = async (req, res) => {
  const { type, startDate, endDate, year, month } = req.query;

  const reportData = await getSalesReportService(type, startDate, endDate, year, month);
  const orders = await getSalesReportOrdersService(type, startDate, endDate, year, month);

  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
  });

  const filePath = path.join('uploads', `Sales_Report_${Date.now()}.pdf`);
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  const formatCurrency = (amount) => {
    const num = Number(amount || 0).toFixed(2);
    const parts = num.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    let formatted = '';
    let count = 0;
    for (let i = integerPart.length - 1; i >= 0; i--) {
      if (count === 3) {
        formatted = ',' + formatted;
        count = 0;
      }
      formatted = integerPart[i] + formatted;
      count++;
    }

    return 'Rs.' + formatted + '.' + decimalPart;
  };
  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  doc.fontSize(24).fillColor('#2c3e50').text('SALES REPORT', { align: 'center' });
  doc.moveDown(0.3);

  let periodText = '';
  if (type === 'custom' && startDate && endDate) {
    periodText = `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`;
  } else if (type === 'yearly' && year) {
    periodText = `Year: ${year}`;
  } else if (type === 'monthly' && year && month) {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    periodText = `Period: ${monthNames[month - 1]} ${year}`;
  } else if (type === 'daily') {
    periodText = `Period: Today (${formatDate(new Date())})`;
  } else if (type === 'weekly') {
    periodText = `Period: This Week`;
  }

  doc.fontSize(10).fillColor('#7f8c8d').text(periodText, { align: 'center' });
  doc.fontSize(9).text(`Generated: ${formatDate(new Date())}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(14).fillColor('#2c3e50').text('Summary', { underline: true });
  doc.moveDown(0.5);

  const summaryBoxY = doc.y;
  doc.rect(40, summaryBoxY - 5, 515, 200).fillAndStroke('#f8f9fa', '#dee2e6');

  doc.fillColor('#2c3e50');
  let currentY = summaryBoxY + 10;

  const summaryItems = [
    { label: 'Total Sales Count', key: 'salesCount' },
    { label: 'Total Order Amount', key: 'totalAmount', isCurrency: true },
    { label: 'Total Discount', key: 'totalDiscount', isCurrency: true },
    { label: 'Total Coupon Deduction', key: 'couponDeduction', isCurrency: true },
    { label: 'Total Order Price', key: 'totalPrice', isCurrency: true },
    { label: 'Cancelled Orders Count', key: 'cancelCount' },
    { label: 'Cancelled Amount', key: 'cancelSum', isCurrency: true },
    { label: 'Returned Orders Count', key: 'returnCount' },
    { label: 'Returned Amount', key: 'returnSum', isCurrency: true },
    { label: 'Net Revenue', key: 'totalRevenue', isCurrency: true, highlight: true },
  ];

  summaryItems.forEach((item) => {
    const value = item.isCurrency
      ? formatCurrency(reportData[item.key])
      : reportData[item.key] || 0;

    if (item.highlight) {
      doc.fontSize(12).fillColor('#27ae60').font('Helvetica-Bold');
    } else {
      doc.fontSize(11).fillColor('#2c3e50').font('Helvetica');
    }

    doc.text(`${item.label}:`, 60, currentY, { continued: true, width: 300 });
    doc.text(value, { align: 'right', width: 150 });

    currentY += 18;
  });

  doc.moveDown(2);

  if (orders && orders.length > 0) {
    doc.font('Helvetica');
    doc.fontSize(14).fillColor('#2c3e50').text('Order Details', { underline: true });
    doc.moveDown(0.8);

    const tableTop = doc.y;
    const startX = 40;
    const columnWidths = [40, 100, 80, 60, 100, 100];
    const headers = ['#', 'Order ID', 'Date', 'Items', 'Subtotal', 'Total Amount'];
    const rowHeight = 25;
    const headerHeight = 30;

    doc.rect(startX, tableTop, 515, headerHeight).fillAndStroke('#34495e', '#2c3e50');

    doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold');
    let xPos = startX;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 5, tableTop + 10, {
        width: columnWidths[i] - 10,
        align: i === 0 ? 'center' : 'left',
      });
      xPos += columnWidths[i];
    });

    let currentRowY = tableTop + headerHeight;

    orders.forEach((order, index) => {
      if (currentRowY > 700) {
        doc.addPage();
        currentRowY = 40;

        doc.rect(startX, currentRowY, 515, headerHeight).fillAndStroke('#34495e', '#2c3e50');
        doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold');
        xPos = startX;
        headers.forEach((header, i) => {
          doc.text(header, xPos + 5, currentRowY + 10, {
            width: columnWidths[i] - 10,
            align: i === 0 ? 'center' : 'left',
          });
          xPos += columnWidths[i];
        });
        currentRowY += headerHeight;
      }

      const rowColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
      doc.rect(startX, currentRowY, 515, rowHeight).fillAndStroke(rowColor, '#dee2e6');
      const orderDate = formatDate(order.createdAt);
      const totalItems = order.items?.length || 0;
      const subtotal = order.prices?.subtotal || 0;
      const total = order.prices?.total || 0;

      const rowData = [
        { text: String(index + 1), align: 'center' },
        { text: order.orderId || order._id.toString().slice(-8).toUpperCase(), align: 'left' },
        { text: orderDate, align: 'left' },
        { text: String(totalItems), align: 'center' },
        { text: formatCurrency(subtotal), align: 'right' },
        { text: formatCurrency(total), align: 'right' },
      ];

      doc.fontSize(9).fillColor('#2c3e50').font('Helvetica');
      xPos = startX;
      rowData.forEach((cell, i) => {
        doc.text(cell.text, xPos + 5, currentRowY + 8, {
          width: columnWidths[i] - 10,
          align: cell.align,
        });
        xPos += columnWidths[i];
      });

      currentRowY += rowHeight;
    });

    doc.rect(startX, currentRowY, 515, headerHeight).fillAndStroke('#ecf0f1', '#bdc3c7');

    const totalOrderAmount = orders.reduce((sum, order) => sum + (order.prices?.total || 0), 0);
    const totalSubtotal = orders.reduce((sum, order) => sum + (order.prices?.subtotal || 0), 0);

    doc.fontSize(10).fillColor('#2c3e50').font('Helvetica-Bold');
    doc.text('TOTAL', startX + 5, currentRowY + 10, { width: 280, align: 'right' });
    doc.text(formatCurrency(totalSubtotal), startX + 280, currentRowY + 10, {
      width: 95,
      align: 'right',
    });
    doc.text(formatCurrency(totalOrderAmount), startX + 380, currentRowY + 10, {
      width: 95,
      align: 'right',
    });
  } else {
    doc
      .fontSize(12)
      .fillColor('#95a5a6')
      .text('No orders found for the selected period.', { align: 'center' });
  }

  doc.end();

  writeStream.on('finish', () => {
    res.download(filePath, 'Sales_Report.pdf', (err) => {
      if (err) console.error('Error downloading PDF:', err);
      fs.unlinkSync(filePath);
    });
  });
};

export const createRazorpayOrder = async (req, res) => {
  console.log(req.body);
  const order = await createRazorpayOrderService(req.body);

  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};
export const verifyRazorpayPayment = async (req, res) => {
  const userId = req.userId;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payload } = req.body;
  console.log(payload);
  if (!razorpay_signature) {
    const order = await placeOrderService(userId, {
      ...payload,
      payment: {
        method: 'Online',
        status: 'Failed',
        transactionId: razorpay_payment_id,
      },
      filed: true,
    });

    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: true,
      message: 'Payment Failed',
      order,
    });
  }

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_TEST_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    const order = await placeOrderService(userId, {
      ...payload,
      payment: { method: 'Online', status: 'Failed', transactionId: razorpay_payment_id },
      filed: true,
    });
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      error: true,
      message: 'Signature Mismatch. Payment Failed.',
      order,
    });
  }

  const order = await placeOrderService(userId, {
    ...payload,
    payment: { method: 'Online', status: 'Paid', transactionId: razorpay_payment_id },
  });

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Payment Successful',
    order,
  });
};

export const orderWithWallet = async (req, res) => {
  const userId = req.userId;
  const body = req.body;
  const order = await orderWithWalletService(userId, body);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const createPaypalPayment = async (req, res) => {
  const { total } = req.body;

  const create_payment_json = {
    intent: 'sale',
    payer: { payment_method: 'paypal' },
    redirect_urls: {
      return_url: 'http://localhost:5173/success',
      cancel_url: 'http://localhost:5173/cancel',
    },
    transactions: [
      {
        amount: {
          currency: 'USD',
          total: total.toString(),
        },
        description: 'Order payment on Shopping Cart App',
      },
    ],
  };

  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      console.error(error);
      return res
        .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Payment creation failed' });
    } else {
      const approvalUrl = payment.links.find((link) => link.rel === 'approval_url').href;
      return res.status(STATUS_CODES.OK).json({ approvalUrl });
    }
  });
};

export const executePaypalPayment = async (req, res) => {
  const { paymentId, PayerID } = req.query;

  const execute_payment_json = {
    payer_id: PayerID,
  };

  paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
    if (error) {
      console.error(error.response);
      return res
        .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Payment execution failed' });
    } else {
      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Payment successful',
        payment,
      });
    }
  });
};

export const getFailedOrderController = async (req, res) => {
  const id = req.params.id;
  const order = await getFailedOrderService(id);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const retryFiledRazorpayVerify = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, id } = req.body;
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_TEST_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (!razorpay_signature && generated_signature !== razorpay_signature) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      message: 'Payment Failed',
    });
  }
  const order = await retryFailedOrderService(req.userId, id, {
    method: 'Online',
    status: 'Failed',
    transactionId: razorpay_payment_id,
  });
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const retryFailedOrderWithCOD = async (req, res) => {
  const { id, payment, items } = req.body;
  const order = await retryFailedOrderService(req.userId, id, payment, items);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const retryFailedOrderWithWallet = async (req, res) => {
  const order = await retryFailedOrderWithWalletService(req.userId, req.body);
  res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    order,
  });
};

export const getTopSellingProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;
  const { type, startDate, endDate, year, month } = req.query;
  const { products, totalPosts } = await getTopSellingProductsService(
    page,
    perPage,
    type,
    startDate,
    endDate,
    year,
    month
  );
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    page,
    perPage,
    products,
    totalPosts,
  });
};

export const getTopSellingCategories = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;
  const { type, startDate, endDate, year, month } = req.query;
  const { categories, totalPosts } = await getTopSellingCategoriesService(
    page,
    perPage,
    type,
    startDate,
    endDate,
    year,
    month
  );
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    page,
    perPage,
    categories,
    totalPosts,
  });
};

export const getTopSellingBrands = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;
  const { type, startDate, endDate, year, month } = req.query;
  const { brands, totalPosts } = await getTopSellingBrandsService(
    page,
    perPage,
    type,
    startDate,
    endDate,
    year,
    month
  );
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    page,
    perPage,
    brands,
    totalPosts,
  });
};

export const getRevenueChartData = async (req, res) => {
  const data = await getRevenueChartDataService(req.query);
  return res.status(200).json({ success: true, error: false, data });
};

export const getSalesChartData = async (req, res) => {
  const data = await getSalesChartDataService(req.query);
  return res.status(200).json({ success: true, error: false, data });
};

export const getOrderStatusChartData = async (req, res) => {
  const data = await getOrdersStatusChartDataService(req.query);
  return res.status(200).json({ success: true, error: false, data });
};
