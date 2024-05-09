const express = require("express");

const { PORT } = require("./config");

const app = express();

require("./startup/cors")(app);
require("./startup/db")();
require("./startup/config")();

app.get("/", (_, res) => res.status(200).send("Smart Submission Ticket API"));
require("./startup/routes")(app);

app.get("/ip", (req, res) => {
  const cf_connecting_ip = req.headers["cf-connecting-ip"] || "";
  const Cf_Connecting_Ip = req.headers["Cf-Connecting-Ip"] || "";
  const x_real_ip = req.headers["x-real-ip"] || "";
  const x_forwarded_for = req.headers["x-forwarded-for"] || "";
  const X_Forwarded_For = req.headers["X-Forwarded-For"] || "";
  const remote_address = req.socket.remoteAddress || "";
  const ip = req.ip || "";
  const geoIp = req.useragent.geoIp || "";
  res.status(200).send({
    cf_connecting_ip,
    Cf_Connecting_Ip,
    x_real_ip,
    x_forwarded_for,
    X_Forwarded_For,
    remote_address,
    ip,
    geoIp,
  });
});

const server = app.listen(PORT, () =>
  console.log(`Listening on port ${PORT}...`)
);

module.exports = server;
