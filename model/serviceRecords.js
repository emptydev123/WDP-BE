const mongoose = require("mongoose");
const schema = mongoose.Schema;
const serviceRecordsSchema = new schema(
  {
    service_date: {
      type: Date,
    },
    mileage_at_service: {
      type: Number,
    },
    labor_hours: {
      type: Number,
    },
    total_cost: {
      type: Number,
    },
    service_notes: {
      type: String,
    },
    vehicle_id: {
      type: mongoose.Schema.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    center_id: {
      type: mongoose.Schema.ObjectId,
      ref: "ServiceCenter",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    appointment_id: {
      type: mongoose.Schema.ObjectId,
      ref: "Appointment",
      required: false,
    },
  },
  { timestamps: true }
);
const serviceRecord = mongoose.model("ServiceRecord", serviceRecordsSchema);
module.exports = serviceRecord;
