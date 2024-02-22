const express = require("express");

const router = express.Router();

const { Classes } = require("../models/classes");
const { Batch } = require("../models/batch");

router.get("/", async (req, res, next) => {
  try {
    const classes = await Classes.find().select("-_id -__v");

    const response = {};
    classes.forEach((cls) => {
      response[cls.year] = response[cls.year] || {};
      response[cls.year][cls.class] = cls.batches;
    });

    res.send(response);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/subjects", async (req, res, next) => {
  try {
    const [classes, batches] = await Promise.all([
      Classes.find().select("-_id -__v"),
      Batch.find().select("-_id -__v"),
    ]);

    const response = {};
    classes.forEach((cls) => {
      response[cls.year] = response[cls.year] || {};

      response[cls.year][cls.class] = {};

      cls.batches.forEach((batch) => {
        response[cls.year][cls.class][batch] = {
          theory: [],
          practical: [],
        };
      });
    });

    batches.forEach((batch) => {
      response[batch.year][batch.class][batch.batch] = {
        theory: batch.theory.map((theory) => {
          return {
            title: theory.title,
            teacher: theory.teacher,
          };
        }),
        practical: batch.practical.map((practical) => {
          return {
            title: practical.title,
            noOfAssignments: practical.noOfAssignments,
            teacher: practical.teacher,
          };
        }),
      };
    });

    res.send(response);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
