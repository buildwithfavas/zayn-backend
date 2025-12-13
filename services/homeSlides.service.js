import homeSlidesModel from '../models/homeSlides.model.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRETE_KEY,
  secure: true,
});
const homeSlidesAddService = async (image, body) => {
  let imageUrl;
  if (image) {
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };
    await cloudinary.uploader.upload(image.path, options, function (error, result) {
      imageUrl = result.secure_url;
      fs.unlinkSync(image.path);
    });
  }
  const homeSlide = homeSlidesModel.create({
    description: body.description,
    banner: imageUrl,
    link: body.link,
  });
  return homeSlide;
};

const getHomeSlidesService = async (page, perPage, user) => {
  const totalPosts = await homeSlidesModel.countDocuments();
  const filter = {};
  if (user) {
    filter.isUnlisted = false;
  }
  const homeSlides = await homeSlidesModel
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage);
  return { homeSlides, totalPosts };
};

const editHomeSlidesService = async (id, body, image) => {
  const homeSlide = await homeSlidesModel.findById(id);
  const { description, link } = body;
  if (image) {
    await cloudinary.uploader.destroy(homeSlide.banner);
    let imageUrl;
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: false,
    };
    await cloudinary.uploader.upload(image.path, options, function (error, result) {
      imageUrl = result.secure_url;
      fs.unlinkSync(image.path);
    });
    homeSlide.banner = imageUrl;
  }
  homeSlide.description = description;
  homeSlide.link = link;
  await homeSlide.save();
  return homeSlide;
};

const homeSlidesToggleBlockService = async (id) => {
  const homeSlide = await homeSlidesModel.findByIdAndUpdate(id, [
    { $set: { isUnlisted: { $not: '$isUnlisted' } } },
  ]);
  return homeSlide;
};

export {
  homeSlidesAddService,
  getHomeSlidesService,
  editHomeSlidesService,
  homeSlidesToggleBlockService,
};
