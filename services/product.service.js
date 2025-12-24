import AppError from '../middlewares/Error/appError.js';
import categoryModel from '../models/category.model.js';
import productModel from '../models/product.model.js';
import { v2 as cloudinary } from 'cloudinary';
import variantModel from '../models/variant.model.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { applyBestOffer } from '../utils/applyBestOffer.js';
import Razorpay from 'razorpay';
// Helper to check for duplicates
const checkDuplicateProduct = async (
  name,
  catId,
  subCatId,
  thirdCatId,
  variantsList,
  excludeId = null
) => {
  const query = {
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    categoryId: catId,
    subCategoryId: subCatId,
    thirdSubCategoryId: thirdCatId,
    isUnlisted: false,
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  console.log('--- checkDuplicateProduct Debug ---');
  console.log('Query Name:', name);
  console.log('Query Cats:', catId, subCatId, thirdCatId);
  console.log('Constructed Query:', query);

  const duplicates = await productModel.find(query).populate('variants');
  console.log('Duplicates Found:', duplicates.length);

  if (duplicates.length > 0) {
    // If simple product (no variants requested), and we found a duplicate (which presumably is also simple or we treat Name+Cat collision as enough):
    // Actually user specified "same variant".
    // If New is Simple(No Variant) and Existing has Variants: strictly speaking not "same variant".
    // If New has Variants and Existing is Simple: not same.
    // If New has Variants and Existing has Variants: Check overlap.

    // Normalize new attributes
    // variantsList is array of objects { attributeValue, ... }
    const newAttributes = variantsList ? variantsList.map((v) => v.attributeValue) : [];
    console.log('New Attributes:', newAttributes);

    for (const dup of duplicates) {
      console.log('Checking Dup:', dup.name, 'HasVariant:', dup.hasVariant);
      if (!dup.hasVariant && (!variantsList || variantsList.length === 0)) {
        throw new AppError(
          'A simple product with this name and category already exists.',
          STATUS_CODES.CONFLICT
        );
      }

      if (dup.hasVariant && variantsList && variantsList.length > 0) {
        const existingAttributes = dup.variants.map((v) => v.attributeValue);
        console.log('Existing Attributes:', existingAttributes);
        // Check overlap
        const hasOverlap = newAttributes.some((attr) => existingAttributes.includes(attr));
        console.log('Overlap Found:', hasOverlap);

        if (hasOverlap) {
          throw new AppError(
            `Product with name '${name}' and variant(s) already exists.`,
            STATUS_CODES.CONFLICT
          );
        }
      }
    }
  }
};

const addProductService = async (body, imagesByVariant, files) => {
  const {
    name,
    description,
    brand,
    category,
    subCategory,
    thirdCategory,
    variants,
    isFeatured,
    hasVariant,
    price,
    oldPrice,
    stock,
    discount,
  } = body;

  let parsedVariants = [];
  if (hasVariant) {
    if (typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (e) {
        parsedVariants = [];
      }
    } else {
      parsedVariants = variants;
    }
  }

  // Check Duplicates
  // Note: We use findById for cat IDs to ensure valid ObjectIds in query
  const catId = await categoryModel.findById(category);
  const subCatId = await categoryModel.findById(subCategory);
  const thirdCatId = thirdCategory ? await categoryModel.findById(thirdCategory) : null;

  await checkDuplicateProduct(
    name,
    catId?._id,
    subCatId?._id,
    thirdCatId?._id,
    hasVariant ? parsedVariants : null
  );

  const options = {
    folder: 'products',
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  };

  const commonImagesObj = files.filter((f) => f.fieldname === 'images');

  // Optimize: Parallel Uploads
  console.time('Cloudinary Upload');
  const commonImagesUrl = await Promise.all(
    commonImagesObj.map(async (img) => {
      try {
        const result = await cloudinary.uploader.upload(img.path, options);
        return result.secure_url;
      } finally {
        if (fs.existsSync(`uploads/${img.filename}`)) {
          fs.unlinkSync(`uploads/${img.filename}`);
        }
      }
    })
  );
  console.timeEnd('Cloudinary Upload');

  console.time('Product DB Save');
  let newProduct = await productModel.create({
    name,
    description,
    brand,
    categoryId: catId?._id,
    subCategoryId: subCatId?._id,
    thirdSubCategoryId: thirdCatId?._id,
    isFeatured,
    hasVariant,
    price,
    oldPrice,
    stock,
    discount,
    images: commonImagesUrl,
  });
  console.timeEnd('Product DB Save');

  try {
    const variantDocs = [];

    // Parallelize Variant Processing
    const variantPromises = parsedVariants.map(async (v, i) => {
      let imgUrlArr = [];
      if (imagesByVariant[i] && imagesByVariant[i].length > 0) {
        // Upload images for this specific variant
        imgUrlArr = await Promise.all(
          imagesByVariant[i].map(async (img) => {
            try {
              const result = await cloudinary.uploader.upload(img.path, options);
              return result.secure_url;
            } finally {
              if (fs.existsSync(`uploads/${img.filename}`)) {
                fs.unlinkSync(`uploads/${img.filename}`);
              }
            }
          })
        );
      } else {
        imgUrlArr = [...commonImagesUrl];
      }

      const discount = Math.round(((v.oldPrice - v.price) / v.oldPrice) * 100);
      const newVariant = await variantModel.create({
        productId: newProduct._id,
        attributeValue: v.attributeValue,
        price: v.price,
        oldPrice: v.oldPrice,
        stock: v.stock,
        images: imgUrlArr,
        discount,
      });

      return newVariant;
    });

    const variantsResult = await Promise.all(variantPromises);
    variantDocs.push(...variantsResult);

    // Single DB Update: push all variant IDs at once
    const variantIds = variantsResult.map((v) => v._id);
    if (variantIds.length > 0) {
      await productModel.findByIdAndUpdate(newProduct._id, {
        $push: { variants: { $each: variantIds } },
      });
    }

    return { newProduct, variantDocs };
  } catch (error) {
    // Rollback: delete the created product if variant processing fails
    await productModel.findByIdAndDelete(newProduct._id);
    throw error;
  }
};

const getAllProductsService = async (query, page, perPage) => {
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
      isListed: true,
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
      isListed: true,
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
      isListed: true,
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
  // ... pipeline up to lookups ...
  if (query.admin === 'true') {
    // Admin: Show every variant as a separate row
    pipeline.push(
      { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          defaultVariant: {
            $cond: {
              if: { $and: ['$variants', { $eq: [{ $type: '$variants' }, 'object'] }] },
              then: '$variants',
              else: {
                price: '$price',
                oldPrice: '$oldPrice',
                stock: '$stock',
                images: '$images',
                discount: '$discount',
                _id: '$_id',
                productId: '$_id',
              },
            },
          },
          // Ensure name clearly indicates variant for Admin clarity?
          // The frontend just shows name. Maybe we can append variant info?
          // User didn't explicitly ask to rename, just "shown as different products".
          // Frontend columns (Size/Color) usually show variant info if available.
        },
      }
    );
  } else {
    // User: Consolidate variants (Logic as before)
    if (!query.admin && query.admin !== 'true') {
      pipeline.push({
        $match: {
          'category.isListed': true,
          'subCategory.isListed': true,
          'thirdCategory.isListed': true,
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
            $cond: {
              if: { $gt: [{ $size: '$variants' }, 0] },
              then: {
                $arrayElemAt: [{ $sortArray: { input: '$variants', sortBy: { price: 1 } } }, 0],
              },
              else: {
                price: '$price',
                oldPrice: '$oldPrice',
                stock: '$stock',
                images: '$images',
                discount: '$discount',
                _id: '$_id',
                productId: '$_id',
              },
            },
          },
          stock: {
            $cond: {
              if: { $gt: [{ $size: '$variants' }, 0] },
              then: { $sum: '$variants.stock' },
              else: '$stock',
            },
          },
        },
      }
    );
  }

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

const updateProductService = async (id, body, files) => {
  const product = await productModel.findById(id).populate('variants');
  const {
    name,
    description,
    brand,
    isFeatured,
    category,
    subCategory,
    thirdCategory,
    price,
    oldPrice,
    stock,
    discount,
    images = [],
  } = body;

  let catId = await categoryModel.findById(category);
  let subCatId = await categoryModel.findById(subCategory);
  let thirdCatId = await categoryModel.findById(thirdCategory);

  // Dup Check for Edit
  // We need to check if current variants collide with other product.
  // Note: body doesn't contain 'variants' usually in Edit mode via FormData if standard flow.
  // However, checkDuplicateProduct requires array of attributeValues.
  // We should pass product.variants (existing variants).
  // But wait, if we are RENAMING "Shirt A" -> "Shirt B", we check against "Shirt B".
  // And we pass "Shirt A"'s variants to see if "Shirt B" already has them?

  // Logic: "Admin trying to add a product (or edit) ... Don't allow if Name+Cat+Variant match existing."
  // So if I rename "Shirt A"(Small) to "Shirt B"(Small), and "Shirt B"(Small) exists -> BLOCK.

  // Parse variants from body if present (Frontend now sends it in Edit mode too)
  let parsedVariants = [];
  if (body.variants) {
    if (typeof body.variants === 'string') {
      try {
        parsedVariants = JSON.parse(body.variants);
      } catch (e) {
        parsedVariants = [];
      }
    } else if (Array.isArray(body.variants)) {
      parsedVariants = body.variants;
    }
  }

  // Determine which variants to check against
  // If we are updating to simple (hasVariant=false), check as simple.
  // If updating to variant (hasVariant=true), use the NEW variants from body.
  // If body.variants is missing (legacy/error), fallback to currentVariants?
  // But if editing simple -> variant, currentVariants is empty, so we MUST use body.variants.

  const targetVariants =
    String(body.hasVariant) === 'true'
      ? parsedVariants.length > 0
        ? parsedVariants
        : currentVariants
      : [];
  // If simple, targetVariants is empty []

  await checkDuplicateProduct(
    name,
    catId?._id,
    subCatId?._id,
    thirdCatId?._id,
    targetVariants,
    id // Check products OTHER than self
  );

  // Handle Images
  let imageArr = Array.isArray(images) ? [...images] : [images].filter(Boolean);
  const currentImages = product.images || [];

  // Find images that were removed
  const removedImages = currentImages.filter((img) => !imageArr.includes(img));
  for (let img of removedImages) {
    // Extract public_id/filename from URL for deletion if needed
  }

  // Upload new files
  if (files && files.length > 0) {
    const options = {
      folder: 'products',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };
    for (let f of files) {
      const result = await cloudinary.uploader.upload(f.path, options);
      imageArr.push(result.secure_url);
      if (fs.existsSync(`uploads/${f.filename}`)) {
        fs.unlinkSync(`uploads/${f.filename}`);
      }
    }
  }

  product.name = name;
  product.description = description;
  product.brand = brand;
  product.categoryId = catId?._id;
  product.subCategoryId = subCatId?._id;
  product.thirdSubCategoryId = thirdCatId?._id;
  product.isFeatured = isFeatured;

  // Handle hasVariant transition
  // Frontend now sends 'hasVariant' as string "true"/"false" or boolean
  // If undefined, we assume no change (though frontend should send it).
  if (body.hasVariant !== undefined) {
    const newHasVariant = String(body.hasVariant) === 'true';

    if (product.hasVariant && !newHasVariant) {
      // Switching from Variant -> Simple
      // 1. Unlist or Delete existing variants
      // We can empty the variants array reference in Product
      // And maybe unlist them in Variant collection?
      if (product.variants && product.variants.length > 0) {
        // Unlist them
        await variantModel.updateMany(
          { _id: { $in: product.variants } },
          { $set: { isUnlisted: true } }
        );
      }
      product.variants = [];
    } else if (!product.hasVariant && newHasVariant) {
      // Switching from Simple -> Variant
      // Clear simple product fields to avoid confusion if logic falls back to them
      product.price = 0;
      product.oldPrice = 0;
      product.discount = 0;
      product.stock = 0;
    }
    product.hasVariant = newHasVariant;
  }

  // Update simple product fields
  // If switching to simple, these should be populated by frontend
  if (price !== undefined) product.price = price;
  if (oldPrice !== undefined) product.oldPrice = oldPrice;
  if (stock !== undefined) product.stock = stock;
  if (discount !== undefined) product.discount = discount;

  product.images = imageArr;

  await product.save();
  return product;
};

const unlistProductService = async (id) => {
  const product = await productModel.findByIdAndUpdate(
    id,
    [{ $set: { isUnlisted: { $not: '$isUnlisted' } } }],
    { new: true }
  );
  return product;
};

const deleteProductService = async (id) => {
  const product = await productModel.findByIdAndDelete(id);
  // Also delete associated variants
  if (product && product.variants && product.variants.length > 0) {
    await variantModel.deleteMany({ _id: { $in: product.variants } });
  }
  return product;
};

const getVariantsService = async (id, query) => {
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

const getProductByIdService = async (id) => {
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
    /* {
      $match: {
        'category.isListed': true,
        'subCategory.isListed': true,
        $or: [
          { thirdCategory: { $exists: false } },
          { thirdCategory: { $eq: null } },
          { 'thirdCategory.isListed': true },
        ],
      },
    }, */
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
                    // If variants exist but logic falls through, use variants.
                    // But if NO variants exist ($size variants == 0), we want fallback.
                    // Actually, the original logic for 'else' was '$variants'.
                    // If $variants is empty, we get empty array, and arrayElemAt 0 gives null.
                    // We need to check if variants exist at all.
                    else: '$variants',
                  },
                },
                sortBy: { price: 1 },
              },
            },
            0,
          ],
        },
        variantStockSum: {
          $sum: '$variants.stock',
        },
      },
    },
    {
      $addFields: {
        defaultVariant: {
          $cond: {
            if: { $gt: [{ $size: '$variants' }, 0] },
            then: '$defaultVariant',
            else: {
              price: '$price',
              oldPrice: '$oldPrice',
              stock: '$stock',
              images: '$images',
              discount: '$discount',
              _id: '$_id',
              productId: '$_id',
            },
          },
        },
        stock: {
          $cond: {
            if: { $gt: [{ $size: '$variants' }, 0] },
            then: '$variantStockSum', // Use the calculated sum
            else: '$stock', // Use the original root stock
          },
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
  const variantsToProcess = [product.defaultVariant, ...product.variants].filter(Boolean);
  const variants = await Promise.all(
    variantsToProcess.map(async (variant) => await applyBestOffer(variant))
  );
  console.log(variants);
  if (product.hasVariant) {
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
  }

  return { groupedVariants, product };
};

const unlistVariantService = async (id) => {
  const variant = await variantModel.findByIdAndUpdate(
    id,
    [{ $set: { isUnlisted: { $not: '$isUnlisted' } } }],
    { new: true }
  );
  return variant;
};

const editVariantService = async (id, body, imageFiles) => {
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

const addVariantService = async (id, body, files) => {
  const { stock, attributeValue, price, oldPrice } = body;
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
    attributeValue,
    images: imageArr,
    discount,
    price,
    oldPrice,
  });
  await productModel.findByIdAndUpdate(id, {
    $push: { variants: variant._id },
    $set: {
      hasVariant: true,
      price: 0,
      stock: 0,
      oldPrice: 0,
      discount: 0,
    },
  });
  return variant;
};

const getSearchSuggestionsService = async (q) => {
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

const createRazorpayOrderService = async ({ amount, items, failed = false }) => {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_TEST_KEY_ID,
    key_secret: process.env.RAZORPAY_TEST_KEY_SECRET,
  });

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
        !product.categoryId.isListed ||
        !product.subCategoryId.isListed ||
        !product.thirdSubCategoryId.isListed
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
        !product.categoryId.isListed ||
        !product.subCategoryId.isListed ||
        !product.thirdSubCategoryId.isListed
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

export {
  addProductService,
  getAllProductsService,
  updateProductService,
  unlistProductService,
  getVariantsService,
  getProductByIdService,
  unlistVariantService,
  editVariantService,
  addVariantService,
  getSearchSuggestionsService,
  createRazorpayOrderService,
  deleteProductService,
};
