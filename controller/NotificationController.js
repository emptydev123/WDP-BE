var Reminder = require('../model/maintenanceReminders');

exports.getNotification = async (req, res) => {
    try {
        const reminder = await Reminder.find({
            is_sent: true
        }).populate('vehicle_id');
        res.status(201).json({
            message: "Get data successfully",
            data: reminder
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi không thể lấy data",
            error: error.message,
            success: false,
        });
    }
}
