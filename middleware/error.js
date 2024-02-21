const { ValidationError } = require("joi");

module.exports = function (err, req, res, next) {
  if (err instanceof ValidationError)
    return res.status(400).send({ message: err.details[0].message });

  if (err instanceof SyntaxError)
    return res.status(400).send({ message: "Invalid JSON." });

  res.status(500).send({ message: "Something failed." });
};
