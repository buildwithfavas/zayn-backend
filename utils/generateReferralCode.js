import userModel from '../models/user.model.js';

export const generateReferralCode = async (name) => {
  const base = name.slice(0, 3).toUpperCase();
  let code,
    exists = true;
  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    code = `${base}${random}`;
    exists = await userModel.exists({ referralCode: code });
  }

  return code;
};
