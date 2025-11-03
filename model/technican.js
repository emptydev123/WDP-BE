const mongoose = require("mongoose");
const schema = mongoose.Schema;

const technicanidSchema = new schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Liên kết đến bảng User
            required: true,
        },
        center_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceCenter", // Liên kết đến bảng ServiceCenter
            required: true,
        },
        maxSlotsPerDay: {
            type: Number,
            default: 4,
        },
        status: {
            type: String,
            enum: ["on", "off"],
            default: "on",
        }
    },
    { timestamps: true }
);

const Technican = mongoose.model("Technican", technicanidSchema);
module.exports = Technican;
