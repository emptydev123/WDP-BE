const mongoose = require("mongoose");
const schema = mongoose.Schema;

const interCenterTransferSchema = new schema(
    {
        from_center_id: {
            type: mongoose.Types.ObjectId,
            ref: "ServiceCenter",
            required: true,
        },
        to_center_id: {
            type: mongoose.Types.ObjectId,
            ref: "ServiceCenter",
            required: true,
        },
        items: [
            {
                part_id: {
                    type: mongoose.Types.ObjectId,
                    ref: "Part",
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                supplier: {
                    type: String,
                    required: false, // Hãng cụ thể nếu cần
                },
            },
        ],
        status: {
            type: String,
            enum: [
                "pending", // Đang chờ xử lý
                "accepted", // Trung tâm B chấp nhận đủ hàng
                "rejected", // Trung tâm B từ chối
                "counter_offer", // Trung tâm B đề xuất thay thế
                "counter_accept", // Trung tâm A chấp thuận đề xuất
                "counter_rejected", // Trung tâm A từ chối đề xuất
                "completed", // Đã chuyển kho thành công
                "cancelled", // Đã hủy
            ],
            default: "pending",
        },
        counter_offer_items: [
            {
                part_id: {
                    type: mongoose.Types.ObjectId,
                    ref: "Part",
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                supplier: {
                    type: String,
                    required: false,
                },
                available_quantity: {
                    type: Number,
                    required: true,
                },
            },
        ],
        notes: {
            type: String,
        },
        completed_at: {
            type: Date,
        },
    },
    { timestamps: true }
);

const InterCenterTransfer = mongoose.model(
    "InterCenterTransfer",
    interCenterTransferSchema
);
module.exports = InterCenterTransfer;

