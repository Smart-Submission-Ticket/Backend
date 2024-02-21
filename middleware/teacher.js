const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY, NODE_ENV } = require("../config");
const { Teacher } = require("../models/teacher");

module.exports = async function (req, res, next) {
  try {
    if (NODE_ENV === "development") return next();

    const token = req.header("x-auth-token");
    if (!token)
      return res.status(401).send({
        status: "error",
        message: "Access denied. No token provided.",
      });

    const decoded = jwt.verify(token, JWT_PRIVATE_KEY);

    if (decoded.role === "teacher") {
      const teacher = await Teacher.findById(decoded._id);

      if (!teacher)
        return res.status(401).send({
          status: "error",
          message: "Invalid token.",
        });

      req.user = teacher;
      req.role = "teacher";
    } else {
      return res.status(401).send({
        status: "error",
        message: "Access denied.",
      });
    }

    next();
  } catch (err) {
    res.status(400).send({
      status: "error",
      message: "Invalid token.",
    });
  }
};
