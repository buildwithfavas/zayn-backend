import { Router } from 'express';
import adminAuth from '../../middlewares/auth/adminAuth.js';
import { asyncHandler } from '../../middlewares/Error/asyncHandler.js';
import {
  approveReturnRequestController,
  downloadSalesReportExcel,
  downloadSalesReportPDF,
  getAdminOrdersByItems,
  getAdminOrdersController,
  getOrderItemById,
  getOrderItemsByOrderId,
  getOrderStatusChartData,
  getReturnRequestsController,
  getRevenueChartData,
  getSalesChartData,
  getSalesReportController,
  getTopSellingBrands,
  getTopSellingCategories,
  getTopSellingProducts,
  rejectReturnRequestController,
  updateOrderStatus,
} from '../../controllers/order.controller.js';

const adminOrderRouter = Router();

adminOrderRouter.get('/', adminAuth, asyncHandler(getAdminOrdersController));
adminOrderRouter.get('/items', adminAuth, asyncHandler(getAdminOrdersByItems));
adminOrderRouter.get('/items/:id', adminAuth, asyncHandler(getOrderItemById));
adminOrderRouter.get('/report', adminAuth, asyncHandler(getSalesReportController));
adminOrderRouter.get('/report/chart/revenue', adminAuth, asyncHandler(getRevenueChartData));
adminOrderRouter.get('/report/chart/sales', adminAuth, asyncHandler(getSalesChartData));
adminOrderRouter.get('/report/chart/statuses', adminAuth, asyncHandler(getOrderStatusChartData));
adminOrderRouter.get('/top/products', adminAuth, asyncHandler(getTopSellingProducts));
adminOrderRouter.get('/top/categories', adminAuth, asyncHandler(getTopSellingCategories));
adminOrderRouter.get('/top/brands', adminAuth, asyncHandler(getTopSellingBrands));
adminOrderRouter.get('/report/excel', adminAuth, asyncHandler(downloadSalesReportExcel));
adminOrderRouter.get('/report/pdf', adminAuth, asyncHandler(downloadSalesReportPDF));
adminOrderRouter.get('/:id', adminAuth, asyncHandler(getOrderItemsByOrderId));
adminOrderRouter.patch('/:id', adminAuth, asyncHandler(updateOrderStatus));
adminOrderRouter.patch(
  '/:id/return/approve',
  adminAuth,
  asyncHandler(approveReturnRequestController)
);
adminOrderRouter.patch(
  '/:id/return/reject',
  adminAuth,
  asyncHandler(rejectReturnRequestController)
);
adminOrderRouter.get('/return/requests', adminAuth, asyncHandler(getReturnRequestsController));

export default adminOrderRouter;
