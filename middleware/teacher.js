const { JWT_PRIVATE_KEY, AUTH_REQUIRED } = require("../config");

module.exports = function (req, res, next) {
  if (!AUTH_REQUIRED) return next();

  next();
};
