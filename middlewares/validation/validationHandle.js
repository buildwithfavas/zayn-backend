import { validationResult } from 'express-validator';

export const validationErrorHandle = (req, res, next) => {
  console.log(req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.mapped(),
    });
  }
  next();
};
