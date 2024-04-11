const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");
const { StudentLogin } = require("../models/student_login");
const { Teacher } = require("../models/teacher");

module.exports = async function (req, res, next) {
  try {
    const token = req.header("x-auth-token");
    if (!token)
      return res.status(401).send({
        status: "error",
        message: "Access denied. No token provided.",
      });

    const decoded = jwt.verify(token, JWT_PRIVATE_KEY);

    if (decoded.role === "student") {
      const student = await StudentLogin.findById(decoded._id);

      if (!student)
        return res.status(401).send({
          status: "error",
          message: "Invalid token.",
        });

      req.user = student;
      req.role = "student";
    } else if (decoded.role === "teacher") {
      const teacher = await Teacher.findById(decoded._id);

      if (!teacher)
        return res.status(401).send({
          status: "error",
          message: "Invalid token.",
        });

      req.user = teacher;
      req.role = "teacher";
    }

    next();
  } catch (err) {
    res.status(400).send({
      status: "error",
      message: "Invalid token.",
    });
  }
};
