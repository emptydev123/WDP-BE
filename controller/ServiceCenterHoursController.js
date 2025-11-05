const ServiceCenterHours = require('../model/serviceCenterHours');
const ServiceCenter = require('../model/serviceCenter');
const Appointment = require('../model/appointment');
const Technican = require('../model/technican');
const { getDayOfWeek } = require('../utils/logicSlots');
const { getWeekDates } = require('../utils/timeUtils');
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
 * Lấy lịch làm việc của tất cả các trung tâm theo từng tuần
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

        // Lấy số tuần muốn hiển thị (mặc định 4 tuần)
        const weeks = parseInt(req.query.weeks) || 4;
        const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date();
        startDate.setHours(0, 0, 0, 0);

        // Lấy tất cả các trung tâm (chỉ active centers)
        const serviceCenters = await ServiceCenter.find({ is_active: true })
            .populate("user_id", "username fullName email phone")
            .lean();

        // Lấy tất cả giờ làm việc template (chỉ lấy thông tin cấu hình)
        const allHours = await ServiceCenterHours.find().lean();

        // Nhóm giờ làm việc template theo center_id
        const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const hoursTemplateByCenter = {};

        allHours.forEach((hour) => {
            const centerId = hour.center_id.toString();
            if (!hoursTemplateByCenter[centerId]) {
                hoursTemplateByCenter[centerId] = {};
            }
            hoursTemplateByCenter[centerId][hour.day_of_week] = hour;
        });

        // Xử lý từng trung tâm
        const result = await Promise.all(
            serviceCenters.map(async (center) => {
                const centerId = center._id.toString();
                const hoursTemplate = hoursTemplateByCenter[centerId] || {};

                // Tạo dữ liệu cho từng tuần
                const weeksData = [];

                for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
                    const weekDates = getWeekDates(startDate, weekIndex);
                    const weekStart = weekDates[0];
                    const weekEnd = weekDates[weekDates.length - 1];

                    // Lấy tất cả appointments trong tuần này
                    const weekStartQuery = new Date(weekStart);
                    weekStartQuery.setHours(0, 0, 0, 0);
                    const weekEndQuery = new Date(weekEnd);
                    weekEndQuery.setHours(23, 59, 59, 999);

                    const weekAppointments = await Appointment.find({
                        center_id: centerId,
                        appoinment_date: {
                            $gte: weekStartQuery,
                            $lte: weekEndQuery,
                        },
                        status: {
                            $nin: ["canceled", "completed", "paid"],
                        },
                    }).lean();

                    // Nhóm appointments theo ngày (format YYYY-MM-DD)
                    const appointmentsByDate = {};
                    weekAppointments.forEach((apt) => {
                        const aptDate = new Date(apt.appoinment_date);
                        aptDate.setHours(0, 0, 0, 0);
                        const year = aptDate.getFullYear();
                        const month = String(aptDate.getMonth() + 1).padStart(2, '0');
                        const day = String(aptDate.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;

                        if (!appointmentsByDate[dateStr]) {
                            appointmentsByDate[dateStr] = [];
                        }
                        appointmentsByDate[dateStr].push(apt);
                    });

                    // Tạo dữ liệu cho từng ngày trong tuần
                    const daysData = weekDates.map((date) => {
                        const dayOfWeek = getDayOfWeek(date);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        const template = hoursTemplate[dayOfWeek] || {};

                        // Tính số slot đã được đặt trong ngày này
                        const bookedSlots = appointmentsByDate[dateStr]?.length || 0;
                        const totalSlots = template.totalSlots || 0;
                        const remainingSlots = Math.max(0, totalSlots - bookedSlots);

                        return {
                            date: dateStr,
                            day_of_week: dayOfWeek,
                            open_time: template.open_time || null,
                            close_time: template.close_time || null,
                            is_close: template.is_close || false,
                            totalSlots: totalSlots,
                            bookedSlots: bookedSlots,
                            remainingSlots: remainingSlots,
                            availableSlots: remainingSlots,
                        };
                    });

                    // Format date cho week_start và week_end
                    const formatDate = (date) => {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    };

                    weeksData.push({
                        week_number: weekIndex + 1,
                        week_start: formatDate(weekStart),
                        week_end: formatDate(weekEnd),
                        days: daysData,
                    });
                }

                return {
                    ...center,
                    weeks: weeksData,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: `Lấy danh sách trung tâm và giờ làm việc thành công (${weeks} tuần)`,
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