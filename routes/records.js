const express = require("express");

const { StudentRecord } = require("../models/student_record");
const { Batch } = require("../models/batch");
const auth = require("../middleware/auth");
const teacher = require("../middleware/teacher");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
  try {
    const record = await StudentRecord.findOne({
      rollNo: req.user.rollNo,
    }).select("-_id -__v");

    if (!record) return res.status(404).send({ message: "Record not found" });

    res.send(record);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/rollNo/:rollNo", teacher, async (req, res, next) => {
  try {
    const { rollNo } = req.params;
    if (!rollNo)
      return res.status(400).send({ message: "Roll no not provided" });

    const record = await StudentRecord.findOne({ rollNo }).select("-_id -__v");
    if (!record) return res.status(404).send({ message: "Record not found" });

    res.send(record);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/batch/:batch", teacher, async (req, res, next) => {
  try {
    const { batch } = req.params;
    if (!batch) return res.status(400).send({ message: "Batch not provided" });

    const batchDoc = await Batch.findOne({ batch }).select("-_id -__v");

    if (!batchDoc) return res.status(404).send({ message: "Batch not found" });

    const records = await StudentRecord.find({
      rollNo: { $in: batchDoc.rollNos },
    }).select("-_id -__v");

    if (!records) return res.status(404).send({ message: "Records not found" });
    res.send(records);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

module.exports = router;
