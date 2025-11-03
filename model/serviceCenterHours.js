const mongoose = require('mongoose');
const schema = mongoose.Schema;

const serviceCenterHoursSchema = new schema(
    {
        day_of_week: {
            type: String,
            required: true,
        },
        open_time: {
            type: String,
        },
        close_time: {
            type: String,
        },
        is_close: {
            type: Boolean,
            default: false
        },
        center_id: {
            type: mongoose.Types.ObjectId,
            ref: "ServiceCenter",
            required: true,
        },
        availableSlots: { // Số slot còn lại cho ngày này
            type: Number,
            default: 0,
        },
        totalSlots: { // Tổng số slot cho ngày này (tính theo số nhân viên)
            type: Number,
            default: 0,
        },
        remainingSlots: { // Số slot còn lại sau mỗi lần booking
            type: Number,
            default: 0,
        },
        isBooked: {  // Thêm trường này để kiểm tra nếu có lịch đã đặt
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const ServiceCenterHours = mongoose.model("ServiceCenterHours", serviceCenterHoursSchema);
module.exports = ServiceCenterHours;
