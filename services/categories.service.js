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

export const createCategoryService = async (image, { name, parent, level }) => {
  let isExist;
  let parentCatName;
  if (parent) {
    parentCatName = parent.toLowerCase();
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
    await cloudinary.uploader.upload(image.path, options, function (error, result) {
      imageUrl = result.secure_url;
      fs.unlinkSync(`uploads/${image.filename}`);
    });
  }

  const parentId = await categoryModel.findOne({ name: parent });
  const category = new categoryModel({
    name,
    parentId,
    image: imageUrl,
    parentCatName,
    level,
  });

  await category.save();
  return category;
};

export const getCategoriesService = async (query) => {
  const filter = {};
  if (query.user == 'true') {
    filter.isBlocked = false;
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
  const rootTree = rootCategories.filter((cat) => !cat.isBlocked);
  return { categoryMap, rootTree };
};

export const removeCatImgFromCloudinaryService = async (catImage) => {
  const imageName = catImage.split('/').pop().split('.')[0];
  const del = await cloudinary.uploader.destroy(imageName);
  return del;
};

export const updateCategoryService = async (id, image, { name, parent }) => {
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
    parentId: parent && category.level != 'first' ? parentCat._id : null,
    parentCatName,
  };
  if (imageUrl) {
    updatedData.image = imageUrl;
  }
  await categoryModel.updateMany(
    { parentCatName: category.name.toLowerCase() },
    { parentCatName: name.toLowerCase() }
  );
  const updated = await categoryModel.findByIdAndUpdate(id, updatedData, { new: true });
  return updated;
};

export const getCatsByLevelService = async (level, page, perPage, search) => {
  let filter = { level: level };
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }
  if ((perPage, page)) {
    const totalPosts = await categoryModel.countDocuments({ level: level });
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

export const blockCategoryService = async (id) => {
  const category = await categoryModel.findById(id);
  const newState = !category.isBlocked;
  category.isBlocked = newState;
  await category.save();
  await categoryModel.updateMany({ parentId: id }, { $set: { isBlocked: newState } });
  const subCats = await categoryModel.find({ parentId: id });
  for (let sub of subCats) {
    await categoryModel.updateMany({ parentId: sub._id }, { $set: { isBlocked: newState } });
  }
  return category;
};
