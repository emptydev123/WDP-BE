const mongoose = require('mongoose')
const schema = mongoose.Schema
const maintenanceRemindersSchema = new schema({
    reminder_type: {
        type: String,
        required: true
    },
    due_date: {
        type: Date,
    },
    due_miliage: {
        type: Number,
    },
    message: {
        type: String
    },
    is_sent: {
        type: Boolean,
        default: false
    },
    vehicle_id: {
        type: mongoose.Types.ObjectId,
        ref: "Vehicle",
        required: true
    }
}, { timestamps: true })
const maintenanceReminders = mongoose.model("MaintenanceReminders", maintenanceRemindersSchema);
module.exports = maintenanceReminders