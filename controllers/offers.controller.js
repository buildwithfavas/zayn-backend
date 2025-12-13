import {
  addGlobalOfferService,
  addOfferProductService,
  addOfferToCategoryService,
  editCategoryOfferService,
  editGlobalOfferService,
  getCategoryOffersService,
  getGlobalOffersService,
  toggleOfferStatusService,
} from '../services/offers.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const addOfferToCategory = async (req, res) => {
  const offer = await addOfferToCategoryService(req.body);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    offer,
  });
};

const addOfferProductController = async (req, res) => {
  const offer = await addOfferProductService(req.body);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    offer,
  });
};

const addGlobalOfferController = async (req, res) => {
  const offer = await addGlobalOfferService(req.body);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    offer,
  });
};

const getCategoryOffersController = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const { offers, totalPosts } = await getCategoryOffersService(page, perPage);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    offers,
    totalPosts,
    page,
  });
};

const getGlobalOffersController = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const { offers, totalPosts } = await getGlobalOffersService(page, perPage);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    offers,
    page,
    perPage,
    totalPosts,
  });
};

const toggleOfferStatusController = async (req, res) => {
  const id = req.params.id;
  const offer = await toggleOfferStatusService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    offer,
  });
};

const editCategoryOfferController = async (req, res) => {
  const id = req.params.id;
  const offer = editCategoryOfferService(id, req.body);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    offer,
  });
};

const editGlobalOfferController = async (req, res) => {
  const id = req.params.id;
  const offer = editGlobalOfferService(id, req.body);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    offer,
  });
};

export {
  addOfferToCategory,
  addOfferProductController,
  addGlobalOfferController,
  getCategoryOffersController,
  getGlobalOffersController,
  toggleOfferStatusController,
  editCategoryOfferController,
  editGlobalOfferController,
};
