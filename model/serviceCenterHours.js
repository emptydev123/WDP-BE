const mongoose = require('mongoose')
const schema = mongoose.Schema
const serviceCenterHoursSchema = new schema({
    day_of_week: {
        type: String,
        required: true
    },
    open_time: {
        type: String,

    },
    close_time: {
        type: String
    },
    is_close: {
        type: Boolean

    },
    center_id: {
        type: mongoose.Types.ObjectId,
        ref: "ServiceCenter",
        required: true
    }


}, { timestamps: true });
const serviceCenterHours = mongoose.model("ServiceCenterHours", serviceCenterHoursSchema);
module.exports = serviceCenterHours