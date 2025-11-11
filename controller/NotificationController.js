var Reminder = require('../model/maintenanceReminders');
var Vehicle = require('../model/vehicle');

exports.getNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Lấy tất cả vehicle của user
        const userVehicles = await Vehicle.find({ user_id: userId }).select('_id');
        const vehicleIds = userVehicles.map(v => v._id);
        
        // Lấy reminders của các xe thuộc user
        const reminder = await Reminder.find({
            is_sent: true,
            vehicle_id: { $in: vehicleIds }
        })
        .populate('vehicle_id')
        .sort({ createdAt: -1 })
        .limit(50);
        
        // Lọc bỏ các reminder có vehicle_id null (trường hợp vehicle đã bị xóa)
        const validReminders = reminder.filter(r => r.vehicle_id !== null);
        
        res.status(200).json({
            message: "Get data successfully",
            data: validReminders
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi không thể lấy data",
            error: error.message,
            success: false,
        });
    }
}

exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;
        
        // Lấy reminder
        const reminder = await Reminder.findById(notificationId).populate('vehicle_id');
        
        if (!reminder) {
            return res.status(404).json({
                message: "Không tìm thấy thông báo",
                success: false,
            });
        }
        
        // Kiểm tra xe có thuộc user không
        if (!reminder.vehicle_id || reminder.vehicle_id.user_id.toString() !== userId) {
            return res.status(403).json({
                message: "Không có quyền đánh dấu thông báo này",
                success: false,
            });
        }
        
        // Đánh dấu đã đọc
        reminder.is_read = true;
        await reminder.save();
        
        res.status(200).json({
            message: "Đã đánh dấu đọc thành công",
            success: true,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi không thể đánh dấu đã đọc",
            error: error.message,
            success: false,
        });
    }
}

exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Lấy tất cả vehicle của user
        const userVehicles = await Vehicle.find({ user_id: userId }).select('_id');
        const vehicleIds = userVehicles.map(v => v._id);
        
        // Đánh dấu tất cả reminder của user là đã đọc
        await Reminder.updateMany(
            {
                is_sent: true,
                vehicle_id: { $in: vehicleIds },
                is_read: { $ne: true }
            },
            {
                $set: { is_read: true }
            }
        );
        
        res.status(200).json({
            message: "Đã đánh dấu tất cả đã đọc",
            success: true,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi không thể đánh dấu tất cả đã đọc",
            error: error.message,
            success: false,
        });
    }
}
