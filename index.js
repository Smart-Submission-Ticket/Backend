const express = require("express");

const { PORT } = require("./config");

const app = express();

require("./startup/cors")(app);
require("./startup/db")();
require("./startup/config")();

app.get("/", (_, res) => res.status(200).send("Smart Submission Ticket API"));
require("./startup/routes")(app);

const server = app.listen(PORT, () =>
  console.log(`Listening on port ${PORT}...`)
);

module.exports = server;
