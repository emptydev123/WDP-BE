const ServiceCenterHours = require('../model/serviceCenterHours');
const ServiceCenter = require('../model/serviceCenter');
const Technican = require('../model/technican')
exports.createServiceCenterHours = async (center_id) => {
    try {
        // Giả sử trung tâm đã được tạo, giờ tạo giờ làm việc cho mỗi ngày
        const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        // Lấy số lượng nhân viên hiện tại của trung tâm này
        const technicianCount = await Technican.countDocuments({ center_id });
        const totalSlots = technicianCount * 4;  // Mỗi nhân viên có 4 slot

        // Tạo giờ làm việc cho trung tâm này
        for (let day of daysOfWeek) {
            const serviceCenterHours = new ServiceCenterHours({
                center_id,
                day_of_week: day,
                availableSlots: totalSlots,  // Số slot cho mỗi ngày
                totalSlots: totalSlots,      // Tổng số slot cho ngày này
                remainingSlots: totalSlots,  // Số slot còn lại
            });
            await serviceCenterHours.save();
        }
    } catch (error) {
        console.error("Error creating service center hours:", error);
        throw error;
    }
};
exports.getServiceCenterHours = async (center_id) => {
    try {
        const serviceCenterHours = await ServiceCenterHours.find({ center_id });
        return serviceCenterHours;
    } catch (error) {
        console.error("Error getting service center hours:", error);
        throw error;
    }
};

/**
 * Lấy lịch làm việc của tất cả các trung tâm
 */
exports.getAllServiceCentersWithHours = async (req, res) => {
    try {
        const userId = req._id?.toString();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
        }

        // Lấy tất cả các trung tâm (chỉ active centers)
        const serviceCenters = await ServiceCenter.find({ is_active: true })
            .populate("user_id", "username fullName email phone")
            .lean();

        // Lấy tất cả giờ làm việc
        const allHours = await ServiceCenterHours.find().lean();

        // Nhóm giờ làm việc theo center_id và sắp xếp theo thứ trong tuần
        const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const hoursByCenter = {};

        allHours.forEach((hour) => {
            const centerId = hour.center_id.toString();
            if (!hoursByCenter[centerId]) {
                hoursByCenter[centerId] = [];
            }
            hoursByCenter[centerId].push(hour);
        });

        // Sắp xếp giờ làm việc theo thứ trong tuần
        Object.keys(hoursByCenter).forEach((centerId) => {
            hoursByCenter[centerId].sort((a, b) => {
                return daysOrder.indexOf(a.day_of_week) - daysOrder.indexOf(b.day_of_week);
            });
        });

        // Gộp thông tin trung tâm với giờ làm việc
        const result = serviceCenters.map((center) => {
            const centerId = center._id.toString();
            const workingHours = hoursByCenter[centerId] || [];

            return {
                ...center,
                working_hours: workingHours.map((hour) => ({
                    _id: hour._id,
                    day_of_week: hour.day_of_week,
                    open_time: hour.open_time,
                    close_time: hour.close_time,
                    is_close: hour.is_close,
                    availableSlots: hour.availableSlots,
                    totalSlots: hour.totalSlots,
                    remainingSlots: hour.remainingSlots,
                    isBooked: hour.isBooked,
                })),
            };
        });

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách trung tâm và giờ làm việc thành công",
            data: result,
        });
    } catch (error) {
        console.error("Error getting all service centers with hours:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách trung tâm và giờ làm việc",
            error: error.message,
        });
    }
};