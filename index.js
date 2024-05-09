const express = require("express");

const { PORT } = require("./config");

const app = express();

require("./startup/cors")(app);
require("./startup/db")();
require("./startup/config")();

app.get("/", (_, res) => res.status(200).send("Smart Submission Ticket API"));
require("./startup/routes")(app);

app.get("/ip", (req, res) => {
  const ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    req.ip ||
    "";
  const geoIp = req.useragent.geoIp;
  res.status(200).send({ ip, geoIp });
});

const server = app.listen(PORT, () =>
  console.log(`Listening on port ${PORT}...`)
);

module.exports = server;
