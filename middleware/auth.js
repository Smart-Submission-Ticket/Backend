const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY, AUTH_REQUIRED } = require("../config");

module.exports = function (req, res, next) {
  if (!AUTH_REQUIRED) return next();

  const token = req.header("x-auth-token");
  if (!token)
    return res.status(401).send({
      status: "error",
      message: "Access denied. No token provided.",
    });

  try {
    const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send({
      status: "error",
      message: "Invalid token.",
    });
  }
};
