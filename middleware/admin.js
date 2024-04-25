const jwt = require("jsonwebtoken");
const assert = require("assert");

const { JWT_PRIVATE_KEY } = require("../config");
const { Admin } = require("../models/admin");

/*
  Who is an admin?
    - Admin is a teacher who has the role "admin".

  What an admin can do?
    - Admin can upload classes, curriculum, students and attendance data.

  What is the difference between an admin and a teacher?
    - Teacher can only upload or update records for particular subjects and batches assigned to them.
    - Admin can change the entire database.
*/
module.exports = async function (req, res, next) {
  const token = req.header("x-auth-token");
  assert(token, "ERROR 401: Access denied. No token provided.");

  const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
  assert(decoded && decoded.role && decoded._id, "ERROR 401: Invalid token.");
  assert(decoded.role === "admin", "ERROR 401: Access denied.");

  const admin = await Admin.findById(decoded._id);
  assert(admin, "ERROR 401: Invalid token.");

  req.user = admin;
  req.role = decoded.role;

  next();
};
