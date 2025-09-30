const mongoose = require('mongoose')
const schema = mongoose.Schema
const invetorySchema = new schema({
    quantity_avaiable: {
        type: Number,
        required: true
    },
    minimum_stock: {
        type: Number,

    },
    last_restocked: {
        type: Date,
    },
    cost_per_unit: {
        type: Number
    },
    center_id: {
        type: mongoose.Types.ObjectId,
        ref: "ServiceCenter",
        required: true
    },
    part_id: {
        type: mongoose.Types.ObjectId,
        ref: "Part",
        required: true
    }

}, { timestamps: true })
const invetory = mongoose.model("Inventory", invetorySchema);
module.exports = invetory