// Server-side validation. This runs no matter what the frontend already checked —
// a client-side check can always be bypassed (browser devtools, direct API calls, curl),
// so the backend re-validates everything before touching the database.

const { body, validationResult } = require('express-validator');

// Call this after your validation chain in a route
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validates the cart payload sent to /api/checkout/create-session
const validateCheckoutBody = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('productId must be a positive integer'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('quantity must be between 1 and 100'),
  handleValidation,
];

module.exports = { validateCheckoutBody, handleValidation };
