import { body } from 'express-validator';

const signupValidation = [
  body('firstName')
    .notEmpty()
    .withMessage('First Name is required')
    .isLength({ min: 3 })
    .withMessage('Please enter minimum 3 characters')
    .matches(/^[A-Za-z ]+$/)
    .withMessage('First Name can only contain letters and spaces')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('First Name cannot be only spaces');
      }
      return true;
    }),
  body('lastName')
    .notEmpty()
    .withMessage('Last Name is required')
    .isLength({ min: 1 })
    .withMessage('Please enter minimum 1 characters')
    .matches(/^[A-Za-z ]+$/)
    .withMessage('Last Name can only contain letters and spaces')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Last Name cannot be only spaces');
      }
      return true;
    }),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/(?=.*[a-z])/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/)
    .withMessage('Password must contain at least one number')
    .matches(/(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must contain at least one special character')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Password cannot be only spaces');
      }
      return true;
    }),
];

const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .custom((value) => {
      if (!value.trim().length) {
        throw new Error('Password cannot be empty spaces');
      }
      return true;
    }),
];

const resetPassValidation = [
  body('newPassword')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/(?=.*[a-z])/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/)
    .withMessage('Password must contain at least one number')
    .matches(/(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must contain at least one special character')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Password cannot be only spaces');
      }
      return true;
    }),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Must enter confirm password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords must match');
      }
      return true;
    }),
];

const productValidation = [
  body('name')
    .isString()
    .withMessage('Product name must be a string.')
    .trim()
    .notEmpty()
    .withMessage('Product name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters.'),

  body('description')
    .isString()
    .withMessage('Description must be a string.')
    .notEmpty()
    .withMessage('Description is required.'),

  body('category')
    .isString()
    .withMessage('Category must be a string.')
    .notEmpty()
    .withMessage('Category is required.'),

  body('subCategory')
    .isString()
    .withMessage('Sub-category must be a string.')
    .notEmpty()
    .withMessage('Sub-category is required.'),

  body('thirdCategory')
    .isString()
    .withMessage('Third level category must be a string.')
    .notEmpty()
    .withMessage('Third level category is required.'),

  body('brand')
    .isString()
    .withMessage('Brand must be a string.')
    .notEmpty()
    .withMessage('Brand is required.'),

  body('isFeatured').isBoolean().withMessage('isFeatured must be true or false.').toBoolean(),
  body('price').custom((value, { req }) => {
    if (req.body.oldPrice && parseFloat(value) > parseFloat(req.body.oldPrice)) {
      throw new Error('Price must be less than or equal to Old Price.');
    }
    return true;
  }),
  body('variants').isArray().withMessage('Variants must be an array.'),
  body('variants.*.size').optional().isString().withMessage('Size must be a string.'),
  body('variants.*.price')
    .notEmpty()
    .withMessage('Price is required for each variant.')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number.')
    .toFloat(),

  body('variants.*.oldPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Old price must be a positive number.')
    .toFloat(),

  body('variants.*.stock')
    .notEmpty()
    .withMessage('Stock is required for each variant.')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer.')
    .toInt(),

  body('variants').custom((variants) => {
    if (!Array.isArray(variants)) return true; // Handled by isArray check
    variants.forEach((v, index) => {
      if (v.oldPrice && parseFloat(v.price) > parseFloat(v.oldPrice)) {
        throw new Error(`Variant ${index + 1}: Price must be less than or equal to Old Price.`);
      }
    });
    return true;
  }),
];

const editProductValidation = [
  body('name')
    .isString()
    .withMessage('Product name must be a string.')
    .trim()
    .notEmpty()
    .withMessage('Product name is required.')
    .isLength({ min: 6 })
    .withMessage('Product name must be at least 6 characters long.'),

  body('description')
    .isString()
    .withMessage('Description must be a string.')
    .notEmpty()
    .withMessage('Description is required.'),

  body('category')
    .isString()
    .withMessage('Category must be a string.')
    .notEmpty()
    .withMessage('Category is required.'),

  body('subCategory')
    .isString()
    .withMessage('Sub-category must be a string.')
    .notEmpty()
    .withMessage('Sub-category is required.'),

  body('thirdCategory')
    .isString()
    .withMessage('Third level category must be a string.')
    .notEmpty()
    .withMessage('Third level category is required.'),

  body('brand')
    .isString()
    .withMessage('Brand must be a string.')
    .notEmpty()
    .withMessage('Brand is required.'),

  body('isFeatured').isString().withMessage('isFeatured must be true or false.').toBoolean(),
];

const adminLoginValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/(?=.*[a-z])/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/)
    .withMessage('Password must contain at least one number')
    .matches(/(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must contain at least one special character')
    .custom((value) => {
      if (!value.trim().length) {
        throw new Error('Password cannot be empty spaces');
      }
      return true;
    }),
];

export {
  signupValidation,
  loginValidation,
  adminLoginValidation,
  resetPassValidation,
  productValidation,
  editProductValidation,
};
