const express = require("express");
const assert = require("assert");
const bcrypt = require("bcrypt");

const { Admin } = require("../models/admin");
const { ADMIN_EMAIL } = require("../config");

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  assert(email, "ERROR 400: Please provide email.");
  assert(password, "ERROR 400: Please provide password.");

  const admin = new Admin({
    email,
    password: await bcrypt.hash(password, 10),
  });
  await admin.save();

  res.send({ message: "Admin registered." });
});

router.delete("/", async (req, res) => {
  const { email } = req.body;
  assert(email, "ERROR 400: Please provide email.");
  assert(
    email !== ADMIN_EMAIL,
    "ERROR 400: You are not allowed to delete the super admin."
  );

  const admin = await Admin.findOneAndDelete({ email });
  assert(admin, "ERROR 400: Admin not found.");

  res.send({ message: "Admin deleted." });
});

module.exports = router;
