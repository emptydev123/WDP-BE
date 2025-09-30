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
        type: Number
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    service_package_id: {
        type: mongoose.Types.ObjectId,
        ref: "ServicePackage",
        required: true
    }
}, { timestamps: true })
const serviceTypes = mongoose.model('ServiceType', serviceTypesSchema)
module.exports = serviceTypes
