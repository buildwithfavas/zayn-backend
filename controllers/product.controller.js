import { v2 as cloudinary } from 'cloudinary';
import {
  addProductService,
  addVariantService,
  editVariantService,
  getAllProductsService,
  getProductByIdService,
  getSearchSuggestionsService,
  getVariantsService,
  unlistProductService,
  unlistVariantService,
  updateProductService,
} from '../services/product.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRETE_KEY,
  secure: true,
});

const addProductsController = async (req, res) => {
  const { body, files } = req;
  const imagesByVariant = [];
  files.forEach((file) => {
    const match = file.fieldname.match(/variants\[(\d+)\]\[images\]/);
    if (match) {
      const variantIndex = match[1];
      if (!imagesByVariant[variantIndex]) {
        imagesByVariant[variantIndex] = [];
      }
      imagesByVariant[variantIndex].push(file);
    }
  });
  let { newProduct, variantDocs } = await addProductService(body, imagesByVariant, files);
  res.status(STATUS_CODES.CREATED).json({
    success: true,
    error: false,
    message: 'Product added successfully',
    newProduct,
    variantDocs,
  });
};

const getAllProductsController = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const { totalPages, products, totalPosts } = await getAllProductsService(
    req.query,
    page,
    perPage
  );
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    products,
    page,
    totalPages,
    totalPosts,
  });
};

const updateProductController = async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const product = await updateProductService(id, body);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    product,
  });
};

const unlistProductController = async (req, res) => {
  const id = req.params.id;
  const product = await unlistProductService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: product.isUnlisted ? 'Product Unlisted Successfully' : 'Product Listed Successfully',
  });
};

const getVariantsController = async (req, res) => {
  const id = req.params.id;
  const query = req.query;
  const { variants, page, perPage, totalPages, totalPosts } = await getVariantsService(id, query);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    variants,
    page,
    perPage,
    totalPages,
    totalPosts,
  });
};

const getProductByIdController = async (req, res) => {
  const id = req.params.id;
  const { groupedVariants, product } = await getProductByIdService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    product: {
      ...product,
      groupedVariants,
    },
  });
};

const unlistVariantController = async (req, res) => {
  const id = req.params.id;
  const variant = await unlistVariantService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: variant.isUnlisted ? 'Variant Unlisted Successfully' : 'Variant Listed Successfully',
  });
};

const editVariantController = async (req, res) => {
  const id = req.params.id;
  const images = req.files;
  const variant = await editVariantService(id, req.body, images);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Variant Edited Successfully',
    variant,
  });
};

const addVariantController = async (req, res) => {
  const id = req.params.id;
  const variant = await addVariantService(id, req.body, req.files);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    message: 'Variant Added Successfully',
    variant,
  });
};

const getSearchSuggestions = async (req, res) => {
  const { q } = req.query;
  const { categories, products } = await getSearchSuggestionsService(q);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    categories,
    products,
  });
};

export {
  addProductsController,
  getAllProductsController,
  updateProductController,
  unlistProductController,
  getVariantsController,
  getProductByIdController,
  unlistVariantController,
  editVariantController,
  addVariantController,
  getSearchSuggestions,
};
