const mongoose = require("mongoose");
const schema = mongoose.Schema;

const checkinSchema = new schema(
  {
    appointment_id: {
      type: mongoose.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkin_datetime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    scheduled_datetime: {
      type: Date,
      required: true,
    },
    checkin_status: {
      type: String,
      enum: ["on_time", "early", "late", "delay"],
      required: true,
    },
    minutes_difference: {
      type: Number,
      required: true,
    },
    is_delayed: {
      type: Boolean,
      default: false,
      required: true,
    },
    notes: {
      type: String,
      required: false,
    },
    checkin_type: {
      type: String,
      enum: ["arrival", "return", "pickup"],
      default: "arrival",
    },
  },
  { timestamps: true }
);

const Checkin = mongoose.model("Checkin", checkinSchema);
module.exports = Checkin;
