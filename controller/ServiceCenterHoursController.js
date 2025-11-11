const ServiceCenterHours = require('../model/serviceCenterHours');
const ServiceCenter = require('../model/serviceCenter');
const Appointment = require('../model/appointment');
const Technican = require('../model/technican');
const { getDayOfWeek } = require('../utils/logicSlots');
const { getWeekDates } = require('../utils/timeUtils');



/**
 * Lấy danh sách technicians, có thể filter theo center_id (query)
 * - Nếu có center_id: trả về technicians của trung tâm đó
 * - Nếu không: trả về tất cả technicians đang bật (status=on)
 */
exports.getTechnicians = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { center_id } = req.query;

        if (center_id) {
            // Validate center exists
            const center = await ServiceCenter.findOne({ _id: center_id, is_active: true }).lean();
            if (!center) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy trung tâm' });
            }
        }

        const query = { status: 'on' };
        if (center_id) query.center_id = center_id;

        const technicians = await Technican.find(query)
            .populate('user_id', 'username fullName email phone avatar')
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách technician thành công',
            data: technicians.map((t) => ({
                _id: t._id,
                user: t.user_id,
                center_id: t.center_id,
                status: t.status,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
            })),
        });
    } catch (error) {
        console.error('Error getting technicians:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
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
 * Lấy tất cả các ngày trong khoảng startDate đến endDate
 */
const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

/**
 * Lấy lịch làm việc của tất cả các trung tâm theo từng tuần hoặc theo khoảng ngày
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

        // Kiểm tra filter theo center_id (optional) và có start_date/end_date không
        const filterCenterId = req.query.center_id || null;

        // Validate center khi có filter
        if (filterCenterId) {
            const exists = await ServiceCenter.findOne({ _id: filterCenterId, is_active: true }).lean();
            if (!exists) {
                return res.status(404).json({ success: false, message: "Không tìm thấy trung tâm" });
            }
        }

        // Kiểm tra xem có date (ngày cụ thể) không - ưu tiên cao nhất
        const selectedDate = req.query.date || null;
        const hasDateRange = req.query.start_date && req.query.end_date;
        let weeks = 4;
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        let endDate = null;
        let dateRange = [];

        if (selectedDate) {
            // Nếu có date (ngày cụ thể), chỉ trả về dữ liệu của ngày đó
            startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);
            dateRange = [new Date(startDate)];
        } else if (hasDateRange) {
            // Nếu có start_date và end_date, chỉ gen ra các ngày trong khoảng đó
            startDate = new Date(req.query.start_date);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(req.query.end_date);
            endDate.setHours(23, 59, 59, 999);
            dateRange = getDatesInRange(startDate, endDate);
        } else {
            // Nếu không có, dùng logic cũ (4 tuần)
            weeks = parseInt(req.query.weeks) || 4;
        }

        // Lấy tất cả các trung tâm (chỉ active centers), có thể filter theo center_id
        const centerQuery = { is_active: true };
        if (filterCenterId) centerQuery._id = filterCenterId;
        const serviceCenters = await ServiceCenter.find(centerQuery)
            .populate("user_id", "username fullName email phone")
            .lean();

        // Lấy tất cả giờ làm việc template (chỉ lấy thông tin cấu hình)
        const allHours = await ServiceCenterHours.find().lean();

        // Nhóm giờ làm việc template theo center_id
        const hoursTemplateByCenter = {};

        allHours.forEach((hour) => {
            const centerId = hour.center_id.toString();
            if (!hoursTemplateByCenter[centerId]) {
                hoursTemplateByCenter[centerId] = {};
            }
            hoursTemplateByCenter[centerId][hour.day_of_week] = hour;
        });

        // Helper function để format date
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Helper function để generate các khung giờ từ open_time đến close_time
        // Mặc định: 08:00 - 17:00, mỗi khung cách nhau 1 tiếng
        // Mỗi slot kéo dài 1 giờ, nên khung giờ cuối cùng phải kết thúc trước hoặc bằng close_time
        const generateTimeSlots = (openTime, closeTime) => {
            // Nếu không có open_time/close_time, dùng mặc định 08:00 - 17:00
            const start = openTime || "08:00";
            const end = closeTime || "17:00";

            const slots = [];
            const [startHour, startMin] = start.split(':').map(Number);
            const [endHour, endMin] = end.split(':').map(Number);

            // Chuyển đổi sang phút để dễ so sánh
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            const intervalMinutes = 1 * 60; // 1 giờ = 60 phút (mỗi khung cách nhau 1 tiếng)
            const slotDurationMinutes = 1 * 60; // Mỗi slot kéo dài 1 giờ

            let currentMinutes = startMinutes;

            // Chỉ thêm khung giờ nếu khung đó kết thúc trước hoặc bằng close_time
            while (currentMinutes + slotDurationMinutes <= endMinutes) {
                const hour = Math.floor(currentMinutes / 60);
                const min = currentMinutes % 60;
                const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                slots.push(timeStr);

                currentMinutes += intervalMinutes;
                if (currentMinutes >= 24 * 60) break; // Vượt quá 24h
            }

            return slots;
        };

        // Xử lý từng trung tâm
        const result = await Promise.all(
            serviceCenters.map(async (center) => {
                const centerId = center._id.toString();
                const hoursTemplate = hoursTemplateByCenter[centerId] || {};
                // Lấy technicians để tính sức chứa đồng thời theo khung giờ
                const technicians = await Technican.find({ center_id: centerId, status: 'on' })
                    .populate('user_id', 'username fullName email phone avatar')
                    .lean();
                const techCount = technicians.length;

                let weeksData = [];

                if (selectedDate || hasDateRange) {
                    // Trường hợp có start_date và end_date
                    // Lấy tất cả appointments trong khoảng ngày
                    const rangeStartQuery = new Date(startDate);
                    rangeStartQuery.setHours(0, 0, 0, 0);
                    const rangeEndQuery = new Date(endDate);
                    rangeEndQuery.setHours(23, 59, 59, 999);

                    const rangeAppointments = await Appointment.find({
                        center_id: centerId,
                        appoinment_date: {
                            $gte: rangeStartQuery,
                            $lte: rangeEndQuery,
                        },
                        status: {
                            $nin: ["canceled", "completed", "paid"],
                        },
                    }).lean();

                    // Nhóm appointments theo ngày (format YYYY-MM-DD)
                    const appointmentsByDate = {};
                    rangeAppointments.forEach((apt) => {
                        const aptDate = new Date(apt.appoinment_date);
                        aptDate.setHours(0, 0, 0, 0);
                        const dateStr = formatDate(aptDate);

                        if (!appointmentsByDate[dateStr]) {
                            appointmentsByDate[dateStr] = [];
                        }
                        appointmentsByDate[dateStr].push(apt);
                    });

                    // Nhóm các ngày theo tuần (từ thứ 2 đến chủ nhật)
                    const weeksMap = {};

                    // Tạo dữ liệu cho từng ngày và nhóm vào tuần tương ứng
                    dateRange.forEach((date) => {
                        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                        const mondayOfWeek = new Date(date);
                        mondayOfWeek.setDate(date.getDate() + daysToMonday);
                        mondayOfWeek.setHours(0, 0, 0, 0);
                        const weekKey = formatDate(mondayOfWeek);

                        // Khởi tạo tuần nếu chưa có
                        if (!weeksMap[weekKey]) {
                            const sundayOfWeek = new Date(mondayOfWeek);
                            sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);
                            weeksMap[weekKey] = {
                                week_start: formatDate(mondayOfWeek),
                                week_end: formatDate(sundayOfWeek),
                                days: [],
                            };
                        }

                        // Tạo dữ liệu cho ngày này
                        const dayOfWeekName = getDayOfWeek(date);
                        const dateStr = formatDate(date);
                        const template = hoursTemplate[dayOfWeekName] || {};
                        const bookedSlots = appointmentsByDate[dateStr]?.length || 0;
                        const totalSlots = template.totalSlots || 0;
                        const remainingSlots = Math.max(0, totalSlots - bookedSlots);

                        weeksMap[weekKey].days.push({
                            date: dateStr,
                            day_of_week: dayOfWeekName,
                            open_time: template.open_time || null,
                            close_time: template.close_time || null,
                            is_close: template.is_close || false,
                            isBooked: bookedSlots > 0,
                            totalSlots: totalSlots,
                            bookedSlots: bookedSlots,
                            remainingSlots: remainingSlots,
                            availableSlots: remainingSlots,
                        });
                    });

                    // Convert weeksMap thành array và sắp xếp theo week_start
                    // Sửa week_start và week_end để phản ánh đúng khoảng ngày thực tế (không phải cả tuần)
                    weeksData = Object.values(weeksMap)
                        .map((week, index) => {
                            // Sắp xếp days theo date để tìm ngày đầu và ngày cuối
                            const sortedDays = [...week.days].sort((a, b) => a.date.localeCompare(b.date));
                            const actualStart = sortedDays[0]?.date || week.week_start;
                            const actualEnd = sortedDays[sortedDays.length - 1]?.date || week.week_end;

                            return {
                                week_number: index + 1,
                                week_start: actualStart,
                                week_end: actualEnd,
                                days: week.days
                                    .sort((a, b) => a.date.localeCompare(b.date))
                                    .map((d) => {
                                        // Lấy template cho ngày này để có open_time và close_time
                                        const dayTemplate = hoursTemplate[d.day_of_week] || {};

                                        // Nếu ngày đóng cửa hoặc không có technician, trả về timeSlots rỗng
                                        let timeSlots = [];
                                        if (!d.is_close && techCount > 0) {
                                            // Generate tất cả các khung giờ có thể từ open_time đến close_time
                                            const allPossibleTimeSlots = generateTimeSlots(dayTemplate.open_time, dayTemplate.close_time);

                                            // Nhóm appointments theo khung giờ
                                            const dayAppointments = appointmentsByDate[d.date] || [];
                                            const byTime = {};
                                            dayAppointments.forEach((apt) => {
                                                if (!apt.appoinment_time) return;
                                                const t = String(apt.appoinment_time).slice(0, 5);
                                                byTime[t] = (byTime[t] || 0) + 1;
                                            });

                                            // Tạo timeSlots cho tất cả các khung giờ có thể
                                            timeSlots = allPossibleTimeSlots
                                                .map((time) => {
                                                    const bookedCount = byTime[time] || 0;
                                                    const capacity = techCount;
                                                    const isFull = capacity <= 0 ? true : bookedCount >= capacity;
                                                    const available = Math.max(0, capacity - bookedCount);
                                                    return {
                                                        time,
                                                        bookedCount,
                                                        isFull,
                                                        available,
                                                        isBooked: bookedCount > 0
                                                    };
                                                })
                                                .filter((slot) => slot.isBooked || slot.available > 0); // Hiển thị khung giờ đã book hoặc còn trống
                                        }

                                        return { ...d, timeSlots };
                                    }),
                            };
                        })
                        .sort((a, b) => a.week_start.localeCompare(b.week_start));
                } else {
                    // Trường hợp không có start_date và end_date (logic cũ)
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
                            const dateStr = formatDate(aptDate);

                            if (!appointmentsByDate[dateStr]) {
                                appointmentsByDate[dateStr] = [];
                            }
                            appointmentsByDate[dateStr].push(apt);
                        });

                        // Tạo dữ liệu cho từng ngày trong tuần
                        const daysData = weekDates.map((date) => {
                            const dayOfWeek = getDayOfWeek(date);
                            const dateStr = formatDate(date);
                            const template = hoursTemplate[dayOfWeek] || {};

                            // Tính số slot đã được đặt trong ngày này
                            const bookedSlots = appointmentsByDate[dateStr]?.length || 0;
                            const totalSlots = template.totalSlots || 0;
                            const remainingSlots = Math.max(0, totalSlots - bookedSlots);

                            // Nếu ngày đóng cửa hoặc không có technician, trả về timeSlots rỗng
                            let timeSlots = [];
                            if (!template.is_close && techCount > 0) {
                                // Generate tất cả các khung giờ có thể từ open_time đến close_time
                                const allPossibleTimeSlots = generateTimeSlots(template.open_time, template.close_time);

                                // Nhóm appointments theo khung giờ
                                const dayAppointments = appointmentsByDate[dateStr] || [];
                                const byTime = {};
                                dayAppointments.forEach((apt) => {
                                    if (!apt.appoinment_time) return;
                                    const t = String(apt.appoinment_time).slice(0, 5);
                                    byTime[t] = (byTime[t] || 0) + 1;
                                });

                                // Tạo timeSlots cho tất cả các khung giờ có thể
                                timeSlots = allPossibleTimeSlots
                                    .map((time) => {
                                        const bookedCount = byTime[time] || 0;
                                        const capacity = techCount;
                                        const isFull = capacity <= 0 ? true : bookedCount >= capacity;
                                        const available = Math.max(0, capacity - bookedCount);
                                        return {
                                            time,
                                            bookedCount,
                                            isFull,
                                            available,
                                            isBooked: bookedCount > 0
                                        };
                                    })
                                    .filter((slot) => slot.isBooked || slot.available > 0); // Hiển thị khung giờ đã book hoặc còn trống
                            }

                            return {
                                date: dateStr,
                                day_of_week: dayOfWeek,
                                open_time: template.open_time || null,
                                close_time: template.close_time || null,
                                is_close: template.is_close || false,
                                isBooked: bookedSlots > 0,
                                totalSlots: totalSlots,
                                bookedSlots: bookedSlots,
                                remainingSlots: remainingSlots,
                                availableSlots: remainingSlots,
                                timeSlots: timeSlots,
                            };
                        });

                        weeksData.push({
                            week_number: weekIndex + 1,
                            week_start: formatDate(weekStart),
                            week_end: formatDate(weekEnd),
                            days: daysData,
                        });
                    }
                }

                return {
                    ...center,
                    technicians: technicians.map(t => ({
                        _id: t._id,
                        user: t.user_id,
                        center_id: t.center_id,
                        status: t.status,
                        createdAt: t.createdAt,
                        updatedAt: t.updatedAt,
                    })),
                    weeks: weeksData,
                };
            })
        );

        let message = "";
        if (selectedDate) {
            message = `Lấy danh sách trung tâm và giờ làm việc thành công (ngày ${formatDate(startDate)})`;
        } else if (hasDateRange) {
            message = `Lấy danh sách trung tâm và giờ làm việc thành công (từ ${formatDate(startDate)} đến ${formatDate(endDate)})`;
        } else {
            message = `Lấy danh sách trung tâm và giờ làm việc thành công (${weeks} tuần)`;
        }

        return res.status(200).json({
            success: true,
            message: message,
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