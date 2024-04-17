const jwt = require("jsonwebtoken");
const assert = require("assert");

const { JWT_PRIVATE_KEY, NODE_ENV } = require("../config");
const { Teacher } = require("../models/teacher");

module.exports = async function (req, res, next) {
  if (NODE_ENV === "development") return next();

  const token = req.header("x-auth-token");
  assert(token, "ERROR 401: Access denied. No token provided.");

  const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
  assert(decoded && decoded.role && decoded._id, "ERROR 401: Invalid token.");
  assert(decoded.role === "teacher", "ERROR 401: Access denied.");

  const teacher = await Teacher.findById(decoded._id);
  assert(teacher, "ERROR 401: Invalid token.");

  req.user = teacher;
  req.role = "teacher";

  next();
};
