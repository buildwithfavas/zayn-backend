import {
  editHomeSlidesService,
  getHomeSlidesService,
  homeSlidesAddService,
  homeSlidesToggleBlockService,
} from '../services/homeSlides.service.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const homeSlidesAddController = async (req, res) => {
  const image = req.file;
  const body = req.body;
  console.log(body);
  const { homeSlide } = await homeSlidesAddService(image, body);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    homeSlide,
  });
};

export const getHomeSlidesController = async (req, res) => {
  const page = parseInt(req.query.page);
  const perPage = parseInt(req.query.perPage);
  const { homeSlides, totalPosts } = await getHomeSlidesService(page, perPage, req.query.user);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    homeSlides,
    totalPosts,
    page,
    perPage,
    perPage,
  });
};

export const editHomeSlideController = async (req, res) => {
  const image = req.file;
  const homeSlides = await editHomeSlidesService(req.params.id, req.body, image);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    homeSlides,
  });
};

export const homeSlidesToggleBlockController = async (req, res) => {
  const id = req.params.id;
  const homeSlide = await homeSlidesToggleBlockService(id);
  return res.status(STATUS_CODES.OK).json({
    success: true,
    error: false,
    homeSlide,
  });
};
