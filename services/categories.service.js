import categoryModel from '../models/category.model.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { STATUS_CODES } from '../utils/statusCodes.js';
import AppError from '../middlewares/Error/appError.js';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRETE_KEY,
  secure: true,
});

const createCategoryService = async (image, { name, parent, parentId: inputParentId, level }) => {
  let isExist;
  let parentCatName;

  // If parent name is provided, use it. If parentId is provided, we might need to fetch the name for parentCatName field
  if (parent) {
    parentCatName = parent.toLowerCase();
  } else if (inputParentId) {
    const p = await categoryModel.findById(inputParentId);
    if (p) parentCatName = p.name.toLowerCase();
  }

  if (level == 'first') {
    isExist = await categoryModel.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      level: 'first',
    });
  } else {
    isExist = await categoryModel.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      level,
      parentCatName,
    });
  }
  if (isExist) {
    throw new AppError('Category already exist', STATUS_CODES.CONFLICT);
  }
  let imageUrl = '';
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: false,
  };
  if (image) {
    console.log('Service - Uploading image to Cloudinary...');
    await cloudinary.uploader.upload(image.path, options, function (error, result) {
      if (error) {
        console.error('Cloudinary Upload Error:', error);
      } else {
        console.log('Cloudinary Upload Success:', result);
        imageUrl = result.secure_url;
        fs.unlinkSync(`uploads/${image.filename}`);
      }
    });
  } else {
    console.log('Service - No image provided to upload');
  }

  // Determine parentId: use inputParentId if valid, otherwise resolve from parent name
  let finalParentId = inputParentId;
  if (!finalParentId && parent) {
    const p = await categoryModel.findOne({ name: parent });
    if (p) finalParentId = p._id;
  }

  const category = new categoryModel({
    name,
    parentId: finalParentId,
    image: imageUrl,
    parentCatName,
    level,
  });

  await category.save();
  return category;
};

const getCategoriesService = async (query) => {
  const filter = {};
  if (query.user == 'true') {
    filter.isListed = true;
  }
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }
  const categories = await categoryModel.find(filter);
  const categoryMap = {};
  categories.forEach((cat) => {
    categoryMap[cat._id] = { ...cat._doc, children: [] };
  });
  const rootCategories = [];
  categories.forEach((cat) => {
    if (cat.parentId) {
      categoryMap[cat.parentId].children.push(categoryMap[cat._id]);
    } else {
      rootCategories.push(categoryMap[cat._id]);
    }
  });
  const rootTree = rootCategories;
  return { categoryMap, rootTree };
};

const removeCatImgFromCloudinaryService = async (catImage) => {
  const imageName = catImage.split('/').pop().split('.')[0];
  const del = await cloudinary.uploader.destroy(imageName);
  return del;
};

const updateCategoryService = async (id, image, { name, parent }) => {
  const category = await categoryModel.findById(id);

  let imageUrl = null;
  let isExist;
  if (category.level == 'first') {
    isExist = await categoryModel.find({
      name: { $regex: `^${name}$`, $options: 'i' },
      level: 'first',
    });
  } else if (category.level == 'second') {
    isExist = await categoryModel.find({
      name: { $regex: `^${name}$`, $options: 'i' },
      level: 'second',
    });
  } else if (category.level == 'third') {
    isExist = await categoryModel.find({
      name: { $regex: `^${name}$`, $options: 'i' },
      level: 'third',
    });
  }
  if (isExist.length > 0 && name != category.name) {
    throw new AppError('Category already exist', STATUS_CODES.CONFLICT);
  }
  if (image) {
    const catImage = category.image;
    if (catImage) {
      const imageName = catImage.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(imageName);
    }
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };
    await cloudinary.uploader.upload(image.path, options, function (error, result) {
      imageUrl = result.secure_url;
      fs.unlinkSync(`uploads/${image.filename}`);
    });
  }
  let parentCatName;
  let parentCat;
  if (parent) {
    parentCatName = parent.toLowerCase();
    parentCat = await categoryModel.findOne({ name: parent });
  }
  const updatedData = {
    name,
  };

  if (imageUrl) {
    updatedData.image = imageUrl;
  }

  if (parent) {
    updatedData.parentCatName = parent.toLowerCase();
    if (category.level != 'first') {
      updatedData.parentId = parentCat._id;
    }
  }
  await categoryModel.updateMany(
    { parentCatName: category.name.toLowerCase() },
    { parentCatName: name.toLowerCase() }
  );
  const updated = await categoryModel.findByIdAndUpdate(id, updatedData, { new: true });
  return updated;
};

const getCatsByLevelService = async (level, page, perPage, search, filterStatus) => {
  let filter = { level: level };
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if (filterStatus === 'active') {
    filter.isListed = true;
  } else if (filterStatus === 'blocked') {
    filter.isListed = false;
  }
  if ((perPage, page)) {
    const totalPosts = await categoryModel.countDocuments(filter);
    const categories = await categoryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);
    return { categories, totalPosts, totalPages: Math.ceil(totalPosts / perPage) };
  }
  const categories = await categoryModel.find({ level: level });
  return categories;
};

const blockCategoryService = async (id) => {
  const category = await categoryModel.findById(id);
  const newState = !category.isListed;
  category.isListed = newState;
  await category.save();
  await categoryModel.updateMany({ parentId: id }, { $set: { isListed: newState } });
  const subCats = await categoryModel.find({ parentId: id });
  for (let sub of subCats) {
    await categoryModel.updateMany({ parentId: sub._id }, { $set: { isListed: newState } });
  }
  return category;
};

const deleteCategoryService = async (id) => {
  const category = await categoryModel.findById(id);
  if (!category) {
    throw new AppError('Category not found', STATUS_CODES.NOT_FOUND);
  }

  // Define a recursive function to delete category and its children
  const deleteCategoryAndChildren = async (catId) => {
    // Find all children
    const children = await categoryModel.find({ parentId: catId });
    for (const child of children) {
      // Recursively delete children
      await deleteCategoryAndChildren(child._id);
    }

    // Get current category to delete image
    const currentCat = await categoryModel.findById(catId);
    if (currentCat && currentCat.image) {
      try {
        await removeCatImgFromCloudinaryService(currentCat.image);
      } catch (error) {
        console.error(`Failed to delete image for category ${catId}:`, error);
      }
    }

    // Delete the category document
    await categoryModel.findByIdAndDelete(catId);
  };

  // Start the deletion process
  await deleteCategoryAndChildren(id);

  return true;
};

export {
  createCategoryService,
  getCategoriesService,
  removeCatImgFromCloudinaryService,
  updateCategoryService,
  getCatsByLevelService,
  blockCategoryService,
  deleteCategoryService,
};
