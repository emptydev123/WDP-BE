const dayjs = require('dayjs');
const MaintenanceReminders = require('../model/maintenanceReminders');
exports.createMaintenanceReminderForVehicle = async (vehicle) => {

    const dueDate = dayjs(vehicle.purchase_date).add(6, "month").toDate();
    const message = `Xe ${vehicle.license_plate} đến hạn bảo dưỡng vào ${dayjs(dueDate).format("DD/MM/YYYY")}`;

    await MaintenanceReminders.create({
        reminder_type: "maintenance",
        due_date: dueDate,
        // due_miliage: vehicle.current_miliage + 5000, // ví dụ: nhắc sau 5000 km
        message,
        vehicle_id: vehicle._id,
    });
}