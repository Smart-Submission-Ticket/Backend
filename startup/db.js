const mongoose = require("mongoose");

const { DB_URL } = require("../config");

module.exports = function () {
  mongoose.connect(DB_URL).then(() => console.log("Connected to MongoDB..."));
};
