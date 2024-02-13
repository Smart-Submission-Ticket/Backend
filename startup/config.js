const { JWT_PRIVATE_KEY } = require("../config");

module.exports = function () {
  if (!JWT_PRIVATE_KEY) {
    throw new Error("FATAL ERROR: JWT_PRIVATE_KEY is not defined.");
  }
};
