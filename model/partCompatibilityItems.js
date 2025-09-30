const mongoose = require('mongoose')
const schema = mongoose.Schema
const partCompatibilityItemsSchema = new schema({
    part_id: {
        type: mongoose.Types.ObjectId,
        ref: "Part",
        required: true,
    },
    model_id: {
        type: mongoose.Types.ObjectId,
        ref: "VehicleModel",
        required: true
    },

}, { timestamps: true })
const partCompatibilityItems = mongoose.model('PartCompatibilityItem', partCompatibilityItemsSchema);
module.exports = partCompatibilityItems