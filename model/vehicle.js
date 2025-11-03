const mongoose = require('mongoose')
const schema = mongoose.Schema;
const vehicleSchema = new schema({
    vin: {
        type: String
    },
    license_plate: {
        type: String
    },
    color: {
        type: String
    },
    purchase_date: {
        type: Date,
    },
    current_miliage: {
        type: Number
    },
    battery_health: {
        type: Number
    },
    last_service_mileage: {
        type: Number
    },
    model_id: {
        type: mongoose.Types.ObjectId,
        ref: "VehicleModel",
        required: true
    },
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },

}, { timestamps: true })
const vehicle = mongoose.model('Vehicle', vehicleSchema);
module.exports = vehicle