const mongoose = require('mongoose')
const schema = mongoose.Schema
const servicePackageSchema = new schema({
    expiry_date: {
        type: Date
    },
    status: {
        type: String
    },
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    vehicle_id: {
        type: mongoose.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },
    service_type_id: {
        type: mongoose.Types.ObjectId,
        ref: "ServiceType",
        required: true
    },

}, { timestamps: true })
const servicePackage = mongoose.model("ServicePackage", servicePackageSchema);
module.exports = servicePackage