// model/assignSchedule.js
const mongoose = require("mongoose");
const schema = mongoose.Schema;

const assignScheduleSchema = new schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointment_id: {
      type: mongoose.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },
    time_start: {
      type: String,
      required: true,
    },
    time_end: {
      type: String,
      required: true,
    },
    assigned_by: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "completed", "cancelled"],
      default: "active",
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

assignScheduleSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const AssignSchedule = mongoose.model("AssignSchedule", assignScheduleSchema);
module.exports = AssignSchedule;
