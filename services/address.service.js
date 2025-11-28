import addressModel from '../models/address.model.js';

export const addAddressService = async (body, userId) => {
  const newAddress = await addressModel.create({
    ...body,
    userId,
  });
  return newAddress;
};

export const getAddressService = async (userId) => {
  const addresses = await addressModel.find({ userId }).sort({ createdAt: -1 });

  return addresses;
};

export const editAddressService = async (id, body) => {
  const address = await addressModel.findByIdAndUpdate(id, { $set: { ...body } }, { new: true });
  return address;
};

export const deleteAddressService = async (id) => {
  const address = await addressModel.findByIdAndDelete(id);
  return address;
};
