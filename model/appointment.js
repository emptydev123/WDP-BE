const mongoose = require("mongoose");
const schema = mongoose.Schema;
const appointmentSchema = new schema(
  {
    appoinment_date: {
      type: Date,
    },
    appoinment_time: {
      type: String,
      require: true,
    },
    status: {
      type: String,
      enum: ["pending", "accept", "completed", "canceled"],
      default: "pending",
    },
    notes: {
      type: String,
    },
    estimated_cost: {
      type: Number,
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicle_id: {
      type: mongoose.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    center_id: {
      type: mongoose.Types.ObjectId,
      ref: "ServiceCenter",
      required: true,
    },
    assigned_by: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: false,
    },
    assigned: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);
const appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = appointment;
