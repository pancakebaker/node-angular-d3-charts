// src/helpers/validate.js
function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

exports.requireNumber = (value, name) => {
  const num = Number(value);
  if (!Number.isFinite(num)) throw badRequest(`${name} is required and must be a number`);
  return num;
};

exports.requireStringMin = (value, name, minLen) => {
  const s = String(value ?? "").trim();
  if (s.length < minLen) throw badRequest(`${name} must be at least ${minLen} characters`);
  return s;
};

exports.requireIntInRange = (value, name, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${name} must be an integer between ${min} and ${max}`);
  }
  return n;
};
