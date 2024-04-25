const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { ADMIN_EMAIL, ADMIN_PASSWORD, JWT_PRIVATE_KEY } = require("../config");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

adminSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, email: this.email, role: "admin" },
    JWT_PRIVATE_KEY
  );
  return token;
};

const Admin = mongoose.model("Admin", adminSchema);

const initAdmin = async () => {
  const admin = await Admin.findOne({ email: ADMIN_EMAIL });

  if (!admin) {
    await Admin.create({
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    });
  }
};

exports.Admin = Admin;
exports.initAdmin = initAdmin;
