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
    estimated_end_time: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "deposited",
        "accepted",
        "assigned",
        "in_progress",
        "completed",
        "paid",
        "canceled",
      ],
      default: "pending",
    },
    notes: {
      type: String,
    },
    estimated_cost: {
      type: Number,
    },
    reason: {
      type: String,
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
    payment_id: {
      type: mongoose.Types.ObjectId,
      ref: "Payment",
      required: false,
    },
    final_payment_id: {
      type: mongoose.Types.ObjectId,
      ref: "Payment",
      required: false,
    },
    service_type_id: {
      type: mongoose.Types.ObjectId,
      ref: "ServiceType",
      required: false,
    },
    technician_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);
const appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = appointment;
