const dayjs = require("dayjs");
const MaintenanceReminders = require("../model/maintenanceReminders");

exports.createMaintenanceReminderForVehicle = async (vehicle) => {
  const dueDate = dayjs(vehicle.purchase_date).add(6, "month").toDate();
  const message = `Xe ${vehicle.license_plate} đến hạn bảo dưỡng vào ${dayjs(
    dueDate
  ).format("DD/MM/YYYY")}`;

  await MaintenanceReminders.create({
    reminder_type: "maintenance",
    due_date: dueDate,
    // due_miliage: vehicle.current_miliage + 5000, // ví dụ: nhắc sau 5000 km
    message,
    vehicle_id: vehicle._id,
  });
};

exports.createAppointmentReminder = async ({ appointment, vehicle }) => {
  if (!appointment?._id || !vehicle?._id) {
    return;
  }

  const appointmentDate = dayjs(appointment.appoinment_date);
  if (!appointmentDate.isValid()) {
    return;
  }

  const reminderDate = appointmentDate.subtract(1, "day").startOf("day");

  const message = `Nhắc lịch hẹn vào ${appointmentDate.format(
    "DD/MM/YYYY"
  )} lúc ${appointment.appoinment_time || "không xác định"} cho xe ${vehicle.license_plate || "không rõ"
    }.`;

  await MaintenanceReminders.create({
    reminder_type: "appointment",
    due_date: reminderDate.toDate(),
    message,
    vehicle_id: vehicle._id,
    appointment_id: appointment._id,
  });
};