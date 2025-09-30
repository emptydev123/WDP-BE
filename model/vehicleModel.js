const mongoose = require('mongoose')
const schema = mongoose.Schema
const VehicleModelSchema = new schema({
    brand: {
        type: String,
    },
    model_name: {
        type: String,
    },
    year: {
        type: Number,
    },
    battery_type: {
        type: String,

    },
    motor_type: {
        type: String
    },
    maintenanceIntervalKm: {
        type: Number
    },
    maintenanceIntervaMonths: {
        type: Number
    },


}, { timestamps: true })
const VehicleModel = mongoose.model("VehicleModel", VehicleModelSchema);
module.exports = VehicleModel