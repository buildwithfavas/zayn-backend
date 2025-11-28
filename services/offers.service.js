import offerModel from '../models/offers.model.js';
import productModel from '../models/product.model.js';

export const addOfferToCategoryService = async (body) => {
  const { category, discountValue } = body;
  const offer = await offerModel.updateOne(
    { category },
    { $set: { category, discountValue, scope: 'category', isActive: true } },
    { upsert: true }
  );
  return offer;
};

export const addOfferProductService = async (body) => {
  const { product, discountValue } = body;
  const offer = await offerModel.updateOne(
    { scope: 'product' },
    { $set: { product, discountValue } },
    { upsert: true }
  );
  await productModel.findByIdAndUpdate(product, { discount: discountValue });
  return offer;
};

export const addGlobalOfferService = async (body) => {
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

export const getCategoryOffersService = async (page, perPage) => {
  const totalPosts = await offerModel.countDocuments({ scope: 'category' });
  const offers = await offerModel
    .find({ scope: 'category' })
    .populate('category')
    .skip((page - 1) * perPage)
    .limit(perPage);
  return { offers, totalPosts };
};

export const getGlobalOffersService = async (page, perPage) => {
  const totalPosts = await offerModel.countDocuments({ scope: 'global' });
  const offers = await offerModel
    .find({ scope: 'global' })
    .skip((page - 1) * perPage)
    .limit(perPage);
  return { offers, totalPosts };
};

export const toggleOfferStatusService = async (id) => {
  const offer = await offerModel.findByIdAndUpdate(
    id,
    [{ $set: { isActive: { $not: '$isActive' } } }],
    { new: true }
  );
  return offer;
};

export const editCategoryOfferService = async (id, body) => {
  const offer = await offerModel.findByIdAndUpdate(
    id,
    { $set: { discountValue: body.discountValue } },
    { new: true }
  );
  return offer;
};

export const editGlobalOfferService = async (id, body) => {
  const offer = await offerModel.findByIdAndUpdate(id, { $set: { ...body } }, { new: true });
  return offer;
};
