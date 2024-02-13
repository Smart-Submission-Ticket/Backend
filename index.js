const express = require("express");

const { PORT } = require("./config");

const app = express();

app.get("/", (_, res) => res.send("Welcome to Smart Submission Ticket API"));

require("./startup/cors")(app);
require("./startup/routes")(app);
require("./startup/db")();
require("./startup/config")();

const server = app.listen(PORT, () =>
  console.log(`Listening on port ${PORT}...`)
);

module.exports = server;
