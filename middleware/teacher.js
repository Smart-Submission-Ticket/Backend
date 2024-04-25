const jwt = require("jsonwebtoken");
const assert = require("assert");

const { JWT_PRIVATE_KEY } = require("../config");
const { Teacher } = require("../models/teacher");
const { Admin } = require("../models/admin");

module.exports = async function (req, res, next) {
  const token = req.header("x-auth-token");
  assert(token, "ERROR 401: Access denied. No token provided.");

  const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
  assert(decoded && decoded.role && decoded._id, "ERROR 401: Invalid token.");
  assert(
    decoded.role === "teacher" || decoded.role === "admin",
    "ERROR 401: Access denied."
  );

  const [teacher, admin] = await Promise.all([
    Teacher.findById(decoded._id),
    Admin.findById(decoded._id),
  ]);
  assert(teacher || admin, "ERROR 401: Invalid token.");

  req.user = admin || teacher;
  req.role = decoded.role;

  next();
};
