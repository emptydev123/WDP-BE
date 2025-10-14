const mongoose = require('mongoose')
const schema = mongoose.Schema
const serviceTypesSchema = new schema({
    service_name: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    base_price: {
        type: Number
    },
    estimated_duration: {
        type: String
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    // service_package_id: {
    //     type: mongoose.Types.ObjectId,
    //     ref: "ServicePackage",
    //     // required: true
    // },
    vehicle_id: {
        type: String,
        ref: "Vehicle"
    }
}, { timestamps: true })
const serviceTypes = mongoose.model('ServiceType', serviceTypesSchema)
module.exports = serviceTypes
