import offerModel from '../models/offers.model.js';
import productModel from '../models/product.model.js';

const addOfferToCategoryService = async (body) => {
  const { category, discountValue } = body;
  const offer = await offerModel.updateOne(
    { category },
    { $set: { category, discountValue, scope: 'category', isActive: true } },
    { upsert: true }
  );
  return offer;
};

const addOfferProductService = async (body) => {
  const { product, discountValue } = body;
  const offer = await offerModel.updateOne(
    { scope: 'product' },
    { $set: { product, discountValue } },
    { upsert: true }
  );
  await productModel.findByIdAndUpdate(product, { discount: discountValue });
  return offer;
};

const addGlobalOfferService = async (body) => {
  const { discountValue, title, startDate, expiryDate } = body;
  const offer = await offerModel.create({
    scope: 'global',
    title,
    discountValue,
    startDate,
    expiryDate,
  });
  return offer;
};

const getCategoryOffersService = async (page, perPage) => {
  const totalPosts = await offerModel.countDocuments({ scope: 'category' });
  const offers = await offerModel
    .find({ scope: 'category' })
    .populate('category')
    .skip((page - 1) * perPage)
    .limit(perPage);
  return { offers, totalPosts };
};

const getGlobalOffersService = async (page, perPage) => {
  const totalPosts = await offerModel.countDocuments({ scope: 'global' });
  const offers = await offerModel
    .find({ scope: 'global' })
    .skip((page - 1) * perPage)
    .limit(perPage);
  return { offers, totalPosts };
};

const toggleOfferStatusService = async (id) => {
  const offer = await offerModel.findByIdAndUpdate(
    id,
    [{ $set: { isActive: { $not: '$isActive' } } }],
    { new: true }
  );
  return offer;
};

const editCategoryOfferService = async (id, body) => {
  const offer = await offerModel.findByIdAndUpdate(
    id,
    { $set: { discountValue: body.discountValue } },
    { new: true }
  );
  return offer;
};

const editGlobalOfferService = async (id, body) => {
  const offer = await offerModel.findByIdAndUpdate(id, { $set: { ...body } }, { new: true });
  return offer;
};

export {
  addOfferToCategoryService,
  addOfferProductService,
  addGlobalOfferService,
  getCategoryOffersService,
  getGlobalOffersService,
  toggleOfferStatusService,
  editCategoryOfferService,
  editGlobalOfferService,
};
