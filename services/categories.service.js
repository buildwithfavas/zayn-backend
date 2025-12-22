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
  name = name.trim();
  if (parent) parent = parent.trim();
  // Determine parentId: use inputParentId if valid, otherwise resolve from parent name
  let finalParentId = inputParentId;
  let parentCatName = parent ? parent.toLowerCase() : undefined;

  if (!finalParentId && parent) {
    const parentDoc = await categoryModel.findOne({ name: parent });
    if (parentDoc) {
      finalParentId = parentDoc._id;
      if (!parentCatName) parentCatName = parentDoc.name.toLowerCase();
    }
  } else if (finalParentId && !parentCatName) {
    // If we only have ID, fetch name for potential error message
    const parentDoc = await categoryModel.findById(finalParentId);
    if (parentDoc) parentCatName = parentDoc.name.toLowerCase();
  }

  let isExist;
  if (level === 'first') {
    isExist = await categoryModel.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      level: 'first',
    });
  } else {
    // For nested categories, check existence within the same parent
    const query = {
      name: { $regex: `^${name}$`, $options: 'i' },
      level,
    };
    if (finalParentId) {
      query.parentId = finalParentId;
    } else if (parentCatName) {
      // Fallback
      query.parentCatName = parentCatName;
    }
    isExist = await categoryModel.findOne(query);
  }

  if (isExist) {
    let errorMsg = `Category '${name}' already exists`;
    if (level !== 'first') {
      if (parentCatName) {
        errorMsg += ` under parent category '${parentCatName}'`;
      }
    }
    throw new AppError(errorMsg, STATUS_CODES.CONFLICT);
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
  name = name.trim();
  if (parent) parent = parent.trim();

  const category = await categoryModel.findById(id);
  if (!category) {
    throw new AppError('Category not found', STATUS_CODES.NOT_FOUND);
  }

  // Determine the target parent for validation
  let targetParentId = category.parentId;
  let targetParentName = category.parentCatName;

  if (parent) {
    const parentDoc = await categoryModel.findOne({
      name: { $regex: `^${parent}$`, $options: 'i' },
    }); // precise match
    if (parentDoc) {
      targetParentId = parentDoc._id;
      targetParentName = parentDoc.name.toLowerCase();
    }
  }

  let isExist;
  if (category.level == 'first') {
    isExist = await categoryModel.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      level: 'first',
      _id: { $ne: id },
    });
  } else {
    const query = {
      name: { $regex: `^${name}$`, $options: 'i' },
      level: category.level,
      _id: { $ne: id },
    };
    if (targetParentId) {
      query.parentId = targetParentId;
    } else if (targetParentName) {
      query.parentCatName = targetParentName;
    }
    isExist = await categoryModel.findOne(query);
  }

  if (isExist) {
    let errorMsg = `Category '${name}' already exists`;
    if (category.level !== 'first' && targetParentName) {
      errorMsg += ` under parent category '${targetParentName}'`;
    }
    throw new AppError(errorMsg, STATUS_CODES.CONFLICT);
  }

  let imageUrl = null;
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

  const updatedData = {
    name,
  };

  if (imageUrl) {
    updatedData.image = imageUrl;
  }

  if (parent) {
    updatedData.parentCatName = parent.toLowerCase();
    // Update parentId if changing parent
    if (category.level != 'first') {
      // Look up parent again or use what we found above
      // using findOne again safely or reusing targetParentId calculated above
      updatedData.parentId = targetParentId;
    }
  }

  // Update children's parentCatName if this category is renamed
  if (name.toLowerCase() !== category.name.toLowerCase()) {
    await categoryModel.updateMany({ parentId: id }, { parentCatName: name.toLowerCase() });
  }

  const updated = await categoryModel.findByIdAndUpdate(id, updatedData, { new: true });
  return updated;
};

const getCatsByLevelService = async (level, page, perPage, search, filterStatus) => {
  let filter = { level: level };

  // Search
  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  // Status Filter with Hierarchy
  if (filterStatus === 'active' || filterStatus === 'blocked') {
    const isListed = filterStatus === 'active';
    // console.log(`[Hierarchical Filter] Status: ${filterStatus} (isListed: ${isListed})`);

    // 1. Find directly matching docs (any level)
    const directMatches = await categoryModel.find({ isListed });
    // console.log(`[Hierarchical Filter] Direct Matches: ${directMatches.length}`);

    if (directMatches.length > 0) {
      const relevantIds = new Set(directMatches.map((d) => d._id.toString()));

      // 2. Find Parents (Level 2 & 1)
      const parentIds = [
        ...new Set(directMatches.map((d) => d.parentId && d.parentId.toString()).filter(Boolean)),
      ];

      if (parentIds.length > 0) {
        const parents = await categoryModel.find({ _id: { $in: parentIds } });
        parents.forEach((p) => relevantIds.add(p._id.toString()));

        // 3. Find Grandparents (Level 1)
        const grandParentIds = [
          ...new Set(parents.map((p) => p.parentId && p.parentId.toString()).filter(Boolean)),
        ];
        if (grandParentIds.length > 0) {
          const grandParents = await categoryModel.find({ _id: { $in: grandParentIds } });
          grandParents.forEach((gp) => relevantIds.add(gp._id.toString()));
        }
      }

      // Apply the ID filter
      filter._id = { $in: Array.from(relevantIds) };
    } else {
      // If filtering by status and no matches found, force empty result
      return { categories: [], totalPosts: 0, totalPages: 0 };
    }
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
