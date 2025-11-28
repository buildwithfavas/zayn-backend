import AppError from '../middlewares/Error/appError.js';
import categoryModel from '../models/category.model.js';
import productModel from '../models/product.model.js';
import { v2 as cloudinary } from 'cloudinary';
import variantModel from '../models/variant.schema.js';
import fs from 'fs';
import mongoose from 'mongoose';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { applyBestOffer } from '../utils/applyBestOffer.js';
import Razorpay from 'razorpay';
export const addProductService = async (body, imagesByVariant) => {
  const { name, description, brand, category, subCategory, thirdCategory, variants, isFeatured } =
    body;
  let catId = await categoryModel.findOne({ name: category });
  let subCatId = await categoryModel.findOne({ name: subCategory });
  let thirdCatId = await categoryModel.findOne({ name: thirdCategory });
  let newProduct = await productModel.create({
    name,
    description,
    brand,
    categoryId: catId?._id,
    subCategoryId: subCatId?._id,
    thirdSubCategoryId: thirdCatId?._id,
    isFeatured,
  });

  const variantDocs = [];
  const options = {
    folder: 'products',
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  };
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    let imgUrlArr = [];
    if (imagesByVariant[i]) {
      for (let img of imagesByVariant[i]) {
        const result = await cloudinary.uploader.upload(img.path, options);
        fs.unlinkSync(`uploads/${img.filename}`);
        imgUrlArr.push(result.secure_url);
      }
    }
    const discount = Math.round(((v.oldPrice - v.price) / v.oldPrice) * 100);
    const newVariant = await variantModel.create({
      productId: newProduct._id,
      color: v.color,
      size: v.size,
      weight: v.weight,
      price: v.price,
      oldPrice: v.oldPrice,
      stock: v.stock,
      images: imgUrlArr,
      discount,
    });
    await productModel.findByIdAndUpdate(newProduct._id, { $push: { variants: newVariant._id } });
    variantDocs.push(newVariant);
  }
  return { newProduct, variantDocs };
};

export const getAllProductsService = async (query, page, perPage) => {
  let filter = {};
  if (!query.admin && query.admin !== 'true') {
    filter.isUnlisted = false;
  }
  function capitalizeFirstLetter(value) {
    if (!value) return '';

    if (Array.isArray(value)) {
      return value.map((v) =>
        v
          .split(' ')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ')
      );
    }

    return value
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  if (query.category && query.category.length) {
    const cats = await categoryModel.find({
      name: {
        $in: capitalizeFirstLetter(query.category),
      },
      isBlocked: false,
    });
    if (cats.length) filter.categoryId = { $in: cats.map((c) => c._id) };
    else {
      return { products: [], totalPages: 0, totalPosts: 0 };
    }
  }

  if (query.subCategory && query.subCategory.length) {
    const cats = await categoryModel.find({
      name: {
        $in: capitalizeFirstLetter(query.subCategory),
      },
      isBlocked: false,
    });
    if (cats.length) filter.subCategoryId = { $in: cats.map((c) => c._id) };
    else {
      return { products: [], totalPages: 0, totalPosts: 0 };
    }
  }

  if (query.thirdCategory && query.thirdCategory.length) {
    const cats = await categoryModel.find({
      name: {
        $in: capitalizeFirstLetter(query.thirdCategory),
      },
      isBlocked: false,
    });
    if (cats.length) filter.thirdSubCategoryId = { $in: cats.map((c) => c._id) };
    else {
      return { products: [], totalPages: 0, totalPosts: 0 };
    }
  }

  if (query.search) {
    const matchedCategories = await categoryModel
      .find({
        name: { $regex: query.search, $options: 'i' },
      })
      .select('_id');

    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { brand: { $regex: query.search, $options: 'i' } },
    ];

    if (matchedCategories.length) {
      filter.$or.push(
        { categoryId: { $in: matchedCategories.map((c) => c._id) } },
        { subCategoryId: { $in: matchedCategories.map((c) => c._id) } },
        { thirdSubCategoryId: { $in: matchedCategories.map((c) => c._id) } }
      );
    }
  }
  if (query.isFeatured && query.isFeatured === 'true') {
    filter.isFeatured = true;
  }

  if (query.related) {
    filter._id = { $ne: new mongoose.Types.ObjectId(query.related) };
  }

  let pipeline = [
    {
      $match: filter,
    },
    {
      $lookup: {
        from: 'variants',
        localField: 'variants',
        foreignField: '_id',
        as: 'variants',
        pipeline: [{ $match: { isUnlisted: false } }],
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'subCategoryId',
        foreignField: '_id',
        as: 'subCategory',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'thirdSubCategoryId',
        foreignField: '_id',
        as: 'thirdCategory',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$thirdCategory', preserveNullAndEmptyArrays: true } },
  ];
  if (!query.admin && query.admin !== 'true') {
    pipeline.push({
      $match: {
        'category.isBlocked': false,
        'subCategory.isBlocked': false,
        'thirdCategory.isBlocked': false,
      },
    });
  }
  pipeline.push(
    {
      $addFields: {
        totalVariants: { $size: '$variants' },
        inStockVariants: {
          $filter: {
            input: '$variants',
            as: 'variant',
            cond: { $gt: ['$$variant.stock', 0] },
          },
        },
      },
    },
    {
      $addFields: {
        variants: {
          $cond: {
            if: {
              $and: [{ $gt: ['$totalVariants', 1] }, { $gt: [{ $size: '$inStockVariants' }, 0] }],
            },
            then: '$inStockVariants',
            else: '$variants',
          },
        },
      },
    },

    {
      $addFields: {
        defaultVariant: {
          $arrayElemAt: [{ $sortArray: { input: '$variants', sortBy: { price: 1 } } }, 0],
        },
        stock: { $sum: '$variants.stock' },
      },
    }
  );

  if (query.availability && query.availability === 'true') {
    pipeline.push({
      $match: { stock: { $gt: 0 } },
    });
  }
  if (query.sizes) {
    pipeline.push({
      $match: { 'variants.size': { $in: query.sizes } },
    });
  }
  if (query.rating) {
    const ratings = query.rating.map((r) => parseInt(r));

    pipeline.push({
      $match: {
        $and: [{ rating: { $in: ratings } }, { rating: { $ne: 0 } }],
      },
    });
  }
  if (query.latest) {
    pipeline.push({ $limit: 15 });
  }
  if (query.discount) {
    const minDiscount = parseInt(query.discount);
    pipeline.push({
      $match: { 'defaultVariant.discount': { $gte: minDiscount } },
    });
  }
  if (query.sortBy === 'lowToHigh') {
    pipeline.push({ $sort: { 'defaultVariant.price': 1 } });
  } else if (query.sortBy === 'highToLow') {
    pipeline.push({ $sort: { 'defaultVariant.price': -1 } });
  } else if (query.sortBy === 'aToZ') {
    pipeline.push({ $sort: { name: 1 } });
  } else if (query.sortBy === 'zToA') {
    pipeline.push({ $sort: { name: -1 } });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }
  pipeline.push({ $project: { variants: 0 } });
  if (query.popular) {
    pipeline.push({ $sort: { rating: -1 } }, { $limit: 12 });
  }
  if (perPage && page) {
    pipeline.push({
      $facet: {
        data: [{ $skip: (page - 1) * perPage }, { $limit: perPage }],
        totalCount: [{ $count: 'count' }],
      },
    });
    const result = await productModel.aggregate(pipeline);
    let products = result[0]?.data || [];
    const totalPosts = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalPosts / perPage);

    if (page > totalPages && totalPages > 0) {
      throw new AppError('Page not found', STATUS_CODES.BAD_REQUEST);
    }
    products = await Promise.all(
      products.map(async (product) => {
        product.defaultVariant = await applyBestOffer(product.defaultVariant);
        return product;
      })
    );
    if (query.minPrice || query.maxPrice) {
      products = products.filter(
        (p) => p.defaultVariant.price >= query.minPrice && p.defaultVariant.price <= query.maxPrice
      );
    }
    return { totalPages, products, totalPosts };
  }
  let products = await productModel.aggregate(pipeline);
  products = await Promise.all(
    products.map(async (product) => {
      product.defaultVariant = await applyBestOffer(product.defaultVariant);
      return product;
    })
  );
  if (query.minPrice || query.maxPrice) {
    products = products.filter(
      (p) => p.defaultVariant.price >= query.minPrice && p.defaultVariant.price <= query.maxPrice
    );
  }
  return { products };
};

export const updateProductService = async (id, body) => {
  const product = await productModel.findById(id);
  const { name, description, brand, isFeatured, category, subCategory, thirdCategory } = body;
  console.log(body);
  let catId = await categoryModel.findOne({ name: category });
  let subCatId = await categoryModel.findOne({ name: subCategory });
  let thirdCatId = await categoryModel.findOne({ name: thirdCategory });

  product.name = name;
  product.description = description;
  product.brand = brand;
  product.categoryId = catId?._id;
  product.subCategoryId = subCatId?._id;
  product.thirdSubCategoryId = thirdCatId?._id;
  product.isFeatured = isFeatured;

  await product.save();
};

export const unlistProductService = async (id) => {
  const product = await productModel.findByIdAndUpdate(
    id,
    [{ $set: { isUnlisted: { $not: '$isUnlisted' } } }],
    { new: true }
  );
  return product;
};

export const getVariantsService = async (id, query) => {
  const page = query.page;
  const perPage = query.perPage;
  const totalPosts = await variantModel.countDocuments({ productId: id });
  const variants = await variantModel
    .find({ productId: id })
    .sort({ createdAt: -1 })
    .skip(perPage * (page - 1))
    .limit(perPage);
  const totalPages = Math.ceil(totalPosts / perPage);
  return { variants, totalPages, page, perPage, totalPosts };
};

export const getProductByIdService = async (id) => {
  let pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(id), isUnlisted: false } },
    {
      $lookup: {
        from: 'variants',
        localField: 'variants',
        foreignField: '_id',
        as: 'variants',
        pipeline: [{ $match: { isUnlisted: false } }],
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'subCategoryId',
        foreignField: '_id',
        as: 'subCategory',
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'thirdSubCategoryId',
        foreignField: '_id',
        as: 'thirdCategory',
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$thirdCategory', preserveNullAndEmptyArrays: true } },
    {
      $match: {
        'category.isBlocked': false,
        'subCategory.isBlocked': false,
        'thirdCategory.isBlocked': false,
      },
    },
    {
      $addFields: {
        totalVariants: { $size: '$variants' },
        inStockVariants: {
          $filter: {
            input: '$variants',
            as: 'variant',
            cond: { $gt: ['$$variant.stock', 0] },
          },
        },
      },
    },
    {
      $addFields: {
        defaultVariant: {
          $arrayElemAt: [
            {
              $sortArray: {
                input: {
                  $cond: {
                    if: {
                      $and: [
                        { $gt: ['$totalVariants', 1] },
                        { $gt: [{ $size: '$inStockVariants' }, 0] },
                      ],
                    },
                    then: '$inStockVariants',
                    else: '$variants',
                  },
                },
                sortBy: { price: 1 },
              },
            },
            0,
          ],
        },
        stock: {
          $sum: '$variants.stock',
        },
      },
    },
    {
      $addFields: {
        variants: {
          $sortArray: {
            input: {
              $filter: {
                input: '$variants',
                as: 'variant',
                cond: { $ne: ['$$variant._id', '$defaultVariant._id'] },
              },
            },
            sortBy: { price: 1 },
          },
        },
        stock: { $sum: '$variants.stock' },
      },
    },
  ];

  const products = await productModel.aggregate(pipeline);
  if (products.length == 0) {
    throw new AppError('Product Not Found', STATUS_CODES.NOT_FOUND);
  }
  const product = products[0];
  console.log(product);
  const groupedVariants = {};
  const variants = await Promise.all(
    [product.defaultVariant, ...product.variants].map(
      async (variant) => await applyBestOffer(variant)
    )
  );
  console.log(variants);
  variants.forEach((variant) => {
    const { color, size, price, stock, _id, images, oldPrice, discount } = variant;

    if (!groupedVariants[color]) {
      groupedVariants[color] = {
        color,
        variants: [],
      };
    }
    groupedVariants[color].variants.push({
      size,
      price,
      stock,
      oldPrice,
      _id,
      images,
      discount,
      color,
    });
  });

  return { groupedVariants, product };
};

export const unlistVariantService = async (id) => {
  const variant = await variantModel.findByIdAndUpdate(
    id,
    [{ $set: { isUnlisted: { $not: '$isUnlisted' } } }],
    { new: true }
  );
  return variant;
};

export const editVariantService = async (id, body, imageFiles) => {
  const variant = await variantModel.findById(id);
  const { stock, size, color, price, oldPrice, images = [] } = body;

  let imageArr = [...images];
  console.log(imageArr);
  const removedImages = variant.images.filter((img) => !images.includes(img));
  for (let img of removedImages) {
    const imageName = img.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(imageName);
  }
  if (imageFiles) {
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };
    for (let img of imageFiles) {
      const result = await cloudinary.uploader.upload(img.path, options);
      imageArr.push(result.secure_url);
      fs.unlinkSync(`uploads/${img.filename}`);
    }
  }
  const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
  const updated = {
    stock,
    size,
    color,
    price,
    oldPrice,
    discount,
    images: imageArr,
  };

  const updatedVariant = await variantModel.findByIdAndUpdate(id, updated, { new: true });
  return updatedVariant;
};

export const addVariantService = async (id, body, files) => {
  const { stock, size, color, price, oldPrice } = body;
  let imageArr = [];
  if (files) {
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };
    for (let f of files) {
      const res = await cloudinary.uploader.upload(f.path, options);
      imageArr.push(res.secure_url);
      fs.unlinkSync(`uploads/${f.filename}`);
    }
  }
  const discount = Math.round(((oldPrice - price) / oldPrice) * 100);
  const variant = await variantModel.create({
    productId: id,
    stock,
    size,
    color,
    images: imageArr,
    discount,
    price,
    oldPrice,
  });
  await productModel.findByIdAndUpdate(id, { $push: { variants: variant._id } });
  return variant;
};

export const getSearchSuggestionsService = async (q) => {
  if (!q) return { products: [], categories: [] };

  const products = await productModel
    .find(
      { name: { $regex: q, $options: 'i' }, isUnlisted: false },
      { name: 1, _id: 1, 'defaultVariant.images': { $slice: 1 } }
    )
    .populate('variants')
    .limit(5);

  const categories = await categoryModel.aggregate([
    { $match: { name: { $regex: q, $options: 'i' } } },
    {
      $graphLookup: {
        from: 'categories',
        startWith: '$parentId',
        connectFromField: 'parentId',
        connectToField: '_id',
        as: 'ancestors',
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        ancestors: { _id: 1, name: 1 },
      },
    },
  ]);

  return { products, categories };
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_TEST_KEY_ID,
  key_secret: process.env.RAZORPAY_TEST_KEY_SECRET,
});

export const createRazorpayOrderService = async ({ amount, items, failed = false }) => {
  if (failed) {
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
  } else if (items) {
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
  }

  if (!amount) {
    throw new AppError('Amount is required', STATUS_CODES.BAD_REQUEST);
  }
  const amountInPaise = Math.round(Number(amount) * 100);
  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    payment_capture: 1,
  };
  const order = await razorpay.orders.create(options);
  return order;
};
