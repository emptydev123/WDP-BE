const cron = require("node-cron");
const dayjs = require("dayjs");
const MaintenanceReminders = require("../model/maintenanceReminders");
const { broadcastReminderUpdate } = require("../socket/reminderEvent");
//  Hàm dùng chung: quét và gửi reminder
async function checkDueReminders() {
    const now = dayjs();
    console.log(`CHECK Quét reminder đến hạn tại ${now.format("DD/MM/YYYY HH:mm")}`);

    try {
        const reminders = await MaintenanceReminders.find({
            due_date: { $lte: now.toDate() },
            is_sent: false,
        }).populate("vehicle_id");

        if (!reminders.length) {
            console.log(" Không có reminder nào đến hạn.");
            return;
        }

        for (const reminder of reminders) {
            try {
                console.log(
                    ` Gửi nhắc nhở cho xe: ${reminder.vehicle_id?.license_plate || "Unknown"
                    } - ngày ${dayjs(reminder.due_date).format("DD/MM/YYYY")}`
                );

                // Gọi hàm phát sự kiện WebSocket TRƯỚC KHI set is_sent
                broadcastReminderUpdate(reminder); // Phát sự kiện real-time cho FE

                // Sau đó đánh dấu đã gửi
                reminder.is_sent = true;
                await reminder.save();

                console.log(` Đã gửi reminder ID: ${reminder._id}`);
            } catch (error) {
                console.error(
                    ` Error processing reminder ${reminder._id}:`,
                    error.message
                );
            }
        }

        console.log(" Quét reminder xong.");
    } catch (error) {
        console.error(" Lỗi khi quét reminder:", error.message);
    }
}

//  Cron chạy mỗi ngày lúc 7h và 19h
cron.schedule("02 19 * * *", checkDueReminders);
module.exports = { checkDueReminders }