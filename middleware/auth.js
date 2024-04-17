const jwt = require("jsonwebtoken");
const assert = require("assert");

const { JWT_PRIVATE_KEY } = require("../config");
const { StudentLogin } = require("../models/student_login");
const { Teacher } = require("../models/teacher");

module.exports = async function (req, res, next) {
  const token = req.header("x-auth-token");
  assert(token, "ERROR 401: Access denied. No token provided.");

  const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
  assert(decoded && decoded.role && decoded._id, "ERROR 401: Invalid token.");

  const User = decoded.role === "student" ? StudentLogin : Teacher;
  const user = await User.findById(decoded._id);
  assert(user, "ERROR 401: Invalid token.");

  req.user = user;
  req.role = decoded.role;

  next();
};
