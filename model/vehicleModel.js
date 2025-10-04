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
    type_model: {
        type: String,
        enum: ["1", "2", "3"]
        // 1 phổ thông, 2 trung cấp, 3 cao cấp

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