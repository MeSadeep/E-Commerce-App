// NOTE: This file is NOT used anywhere in the main checkout/shopping flow.
// Since customer login goes through Auth0, Auth0 already hashes and stores
// passwords securely on their end — you never see or handle a customer's
// raw password, so you don't need bcrypt for that part.
//
// This utility is here only in case you later add a separate, local login
// for something like an internal admin dashboard that does NOT use Auth0.
// If you stay fully on Auth0 (recommended), you can delete this file.

const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

async function verifyPassword(plainTextPassword, storedHash) {
  return bcrypt.compare(plainTextPassword, storedHash);
}

module.exports = { hashPassword, verifyPassword };
