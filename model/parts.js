const mongoose = require('mongoose')
const schema = mongoose.Schema
const partSchema = new schema({
    part_number: {
        type: String,
    },
    part_name: {
        type: String,
    },
    description: {
        type: String
    },
    unit_price: {
        type: String
    },
    supplier: {
        type: String
    },
    warranty_month: {
        type: Number
    },

}, { timestamps: true });
const part = mongoose.model("Part", partSchema);
module.exports = part;