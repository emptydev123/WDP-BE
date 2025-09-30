const mongoose = require('mongoose')
const schema = mongoose.Schema
const recordPartSchema = new schema({
    quantity: {
        type: Number,
        required: true
    },
    record_id: {
        type: mongoose.Types.ObjectId,
        ref: "ServiceRecord",
        required: true
    },
    part_id: {
        type: mongoose.Types.ObjectId,
        ref: "Part",
        required: true
    },

}, { timestamps: true })
const recordPart = mongoose.model("RecordPart", recordPartSchema);
module.exports = recordPart