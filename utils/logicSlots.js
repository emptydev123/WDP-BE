const ServiceCenterHours = require("../model/serviceCenterHours");

// =======================================================
//  Lấy thứ trong tuần từ ngày (hàm dùng chung)
// =======================================================
function getDayOfWeek(date) {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayIndex = new Date(date).getDay();
    return daysOfWeek[dayIndex];
}

// =======================================================
// Cập nhật lại slot của một trung tâm (khi thêm nhân viên / reset)
// =======================================================
async function updateSlotsForServiceCenter(center_id, employeeCount) {
    const serviceCenterHours = await ServiceCenterHours.find({ center_id });

    const totalSlotsPerDay = employeeCount * 4; // mỗi nhân viên 4 slot/ngày

    for (let hours of serviceCenterHours) {
        hours.availableSlots = totalSlotsPerDay;
        hours.totalSlots = totalSlotsPerDay;
        hours.remainingSlots = totalSlotsPerDay;
        await hours.save();
    }
    return true;
}

// =======================================================
//  Kiểm tra & reset slot cho tuần sau (nếu user đặt lịch trước)
// =======================================================
async function checkAndUpdateSlotsForNextWeek(appoinment_date, center_id) {
    const today = new Date();
    const nextWeekDate = new Date(appoinment_date);

    // Nếu người dùng đặt cho ngày sau hôm nay
    if (nextWeekDate > today) {
        const dayOfWeek = getDayOfWeek(appoinment_date);
        const serviceCenterHours = await ServiceCenterHours.findOne({
            center_id,
            day_of_week: dayOfWeek,
        });

        if (serviceCenterHours && serviceCenterHours.remainingSlots <= 0) {
            console.log(`Reset slot cho tuần sau (${dayOfWeek}) của center ${center_id}`);
            serviceCenterHours.remainingSlots = serviceCenterHours.totalSlots;
            await serviceCenterHours.save();
        }
    }
}

module.exports = {
    getDayOfWeek,
    updateSlotsForServiceCenter,
    checkAndUpdateSlotsForNextWeek
};
