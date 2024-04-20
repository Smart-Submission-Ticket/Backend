const mongoose = require("mongoose");

const ticketDataSchema = new mongoose.Schema({
  academicYear: {
    type: String,
  },
  attendanceLabAsst: {
    type: String,
  },
  studentAcheivementCommittee: {
    type: String,
  },
  minAttendanceRequired: {
    type: Number,
    default: 75,
  },
  minUTMarksRequired: {
    type: Number,
    default: 12,
  },
});

ticketDataSchema.statics.getTicketData = async function () {
  return await this.findOne().select("-_id -__v");
};

ticketDataSchema.statics.getMinAttendanceAndUTMarks = async function () {
  return await this.findOne().select(
    "minAttendanceRequired minUTMarksRequired -_id"
  );
};

ticketDataSchema.statics.updateTicketData = async function (ticketData) {
  return await this.findOneAndUpdate({}, ticketData, {
    new: true,
    upsert: true,
  });
};

const TicketData = mongoose.model("TicketData", ticketDataSchema);

exports.TicketData = TicketData;
