const mongoose = require("mongoose");

const { DB_URL, DEV_DB_NAME, PROD_DB_NAME } = require("../config");

module.exports = function () {
  mongoose.connect(DB_URL, {
    dbName: process.env.NODE_ENV === "development" ? DEV_DB_NAME : PROD_DB_NAME,
  });

  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", function () {
    console.log("Connected to MongoDB...");
  });
};
