import { validationResult } from 'express-validator';

const validationErrorHandle = (req, res, next) => {
  console.log(req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.mapped(),
    });
  }
  next();
};

export { validationErrorHandle };
