const cron = require('node-cron');
const { updateSlotsForServiceCenter } = require('../utils/logicSlots');
const ServiceCenter = require('../model/serviceCenter');
const Technican = require('../model/technican');

async function hasSlotsBeenReset(center) {
    const lastReset = center.last_reset ? new Date(center.last_reset) : null;
    const today = new Date();

    // Kiểm tra nếu chưa có lần reset hoặc reset đã hơn 1 tuần trước
    return !lastReset || today - lastReset > 7 * 24 * 60 * 60 * 1000; // 7 ngày
}

// Hàm reset số slot cho từng trung tâm
async function resetSlotsForCenter(center) {
    try {
        const employeeCount = await Technican.countDocuments({ center_id: center._id });

        // Cập nhật số slot cho trung tâm và các ngày trong tuần
        await updateSlotsForServiceCenter(center._id, employeeCount);
        console.log(`Slots for center ${center.center_name} have been reset.`);

        // Cập nhật thời gian reset
        center.last_reset = new Date();
        await center.save();
    } catch (error) {
        console.error(`Error resetting slots for center ${center.center_name}:`, error);
    }
}

// Hàm thực hiện reset slot cho tất cả các trung tâm
async function resetSlotsForAllCenters() {
    try {
        console.log("Checking and resetting slots for all centers...");

        // Lấy tất cả các trung tâm dịch vụ
        const serviceCenters = await ServiceCenter.find();

        // Quét qua từng trung tâm và reset nếu chưa reset
        for (const center of serviceCenters) {
            const shouldReset = await hasSlotsBeenReset(center);

            if (shouldReset) {
                await resetSlotsForCenter(center);
            } else {
                console.log(`Center ${center.center_name} has already been reset this week.`);
            }
        }

        console.log("Slots reset completed for all centers.");
    } catch (error) {
        console.error("Error resetting slots:", error);
    }
}

// Cron job chạy mỗi sáng 00:00 thứ Hai
cron.schedule('0 0 * * 1', resetSlotsForAllCenters);
module.exports = { resetSlotsForAllCenters };