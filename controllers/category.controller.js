import fs from 'fs';
import AppError from '../middlewares/Error/appError.js';
import {
  blockCategoryService,
  createCategoryService,
  getCategoriesService,
  getCatsByLevelService,
  updateCategoryService,
  deleteCategoryService,
} from '../services/categories.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

const createCategory = async (req, res) => {
  const image = req.file;

  // DEBUG LOGGING

  const debugLog = `[${new Date().toISOString()}] Create Payload: ${JSON.stringify(req.body)}\n`;
  fs.appendFileSync('debug_create.txt', debugLog);

  const category = await createCategoryService(image, req.body);
  if (!category) {
    throw new AppError('Category creation failed', STATUS_CODES.BAD_REQUEST);
  }
  return res.status(STATUS_CODES.CREATED).json({
    category: category,
    message: 'category created',
    success: true,
    error: false,
  });
};

const getAllCategories = async (req, res) => {
  const query = req.query;
  let { categoryMap, rootTree: rootCategories } = await getCategoriesService(query);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    rootCategories,
    categoryMap,
  });
};

const updateCategory = async (req, res) => {
  const image = req.file;

  const updated = await updateCategoryService(req.params.id, image, req.body);
  if (!updated) {
    throw new AppError('Category could not be updated', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
  return res.status(STATUS_CODES.OK).json({
    message: 'category updated successfully',
    success: true,
    error: false,
    category: updated,
  });
};

const getCategoriesByLevel = async (req, res) => {
  const level = req.params.level;
  const perPage = req?.query?.perPage;
  const page = req?.query?.page;
  const search = req?.query?.search;
  const filter = req?.query?.filter;
  if ((perPage, page)) {
    const { categories, totalPosts, totalPages } = await getCatsByLevelService(
      level,
      page,
      perPage,
      search,
      filter
    );
    return res.status(STATUS_CODES.OK).json({
      success: true,
      error: false,
      categories,
      totalPosts,
      totalPages,
      page,
      perPage,
    });
  } else {
    const categories = await getCatsByLevelService(level, page, perPage);
    return res.status(STATUS_CODES.OK).json({
      success: true,
      error: false,
      categories,
    });
  }
};

const blockCategory = async (req, res) => {
  const id = req.params.id;
  const category = await blockCategoryService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    category,
    message: !category.isListed
      ? 'Category Blocked Successfully '
      : 'Category Unblocked Successfully',
  });
};

const deleteCategory = async (req, res) => {
  const id = req.params.id;
  const deleted = await deleteCategoryService(id);
  if (!deleted) {
    throw new AppError('Category deletion failed', STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Category and its subcategories deleted successfully',
  });
};

export {
  createCategory,
  getAllCategories,
  updateCategory,
  getCategoriesByLevel,
  blockCategory,
  deleteCategory,
};
