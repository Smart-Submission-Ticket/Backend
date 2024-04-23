const cors = require("cors");
const useragent = require("express-useragent");

module.exports = function (app) {
  app.use(
    cors({
      exposedHeaders: ["x-auth-token"],
    })
  );

  app.use(useragent.express());
};
