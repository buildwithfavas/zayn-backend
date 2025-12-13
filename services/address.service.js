import addressModel from '../models/address.model.js';

const addAddressService = async (body, userId) => {
  const newAddress = await addressModel.create({
    ...body,
    userId,
  });
  return newAddress;
};

const getAddressService = async (userId) => {
  const addresses = await addressModel.find({ userId }).sort({ createdAt: -1 });

  return addresses;
};

const editAddressService = async (id, body) => {
  const address = await addressModel.findByIdAndUpdate(id, { $set: { ...body } }, { new: true });
  return address;
};

const deleteAddressService = async (id) => {
  const address = await addressModel.findByIdAndDelete(id);
  return address;
};

export { addAddressService, getAddressService, editAddressService, deleteAddressService };
