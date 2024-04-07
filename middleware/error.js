const { ValidationError } = require("joi");

module.exports = function (err, req, res, next) {
  if (process.env.NODE_ENV === "development") console.log(err);

  if (err instanceof ValidationError)
    return res.status(400).send({ message: err.details[0].message });

  if (err instanceof SyntaxError)
    return res.status(400).send({ message: "Invalid JSON." });

  // ERROR 404: Not Found
  if (err.message.startsWith("ERROR")) {
    let [status, ...messages] = err.message.split(":");
    let message = messages.join(":");

    try {
      status = parseInt(status.split(" ")[1].trim());
    } catch {
      status = 400;
    }
    message = message.trim();
    return res.status(status).send({ message: message });
  }

  // If error contains a message, send it
  if (err.message) return res.status(400).send({ message: err.message });

  res.status(500).send({ message: "Something failed." });
};
