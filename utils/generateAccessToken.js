import jwt from 'jsonwebtoken';
const generateAccessToken = (userId, role) => {
  const token = jwt.sign({ id: userId, role }, process.env.JWT_KEY, { expiresIn: '5m' });
  return token;
};
export default generateAccessToken;
