let io;

function broadcastReminderUpdate(data) {
    if (!io) {
        console.error("❌ WebSocket io is not initialized yet");
        return;  // Nếu io chưa được khởi tạo thì không thực hiện phát sự kiện
    }

    try {
        const reminderMessage = {
            message: `Nhắc nhở bảo dưỡng cho xe ${data.vehicle_id?.license_plate || 'Unknown'} đã đến hạn`,
            vehicle: data.vehicle_id?.license_plate || 'Unknown',
            due_date: data.due_date,
            reminder_id: data._id,
            type: "maintenance_reminder"
        };

        // Phát sự kiện cho TẤT CẢ các client đang kết nối
        io.emit("reminderSent", reminderMessage);
        console.log(`📢 Broadcasted reminder: ${reminderMessage.message}`);
    } catch (error) {
        console.error("❌ Error broadcasting reminder:", error.message);
    }
}

// Gán instance io sau khi WebSocket đã được khởi tạo
function setIoInstance(ioInstance) {
    io = ioInstance;  // Gán instance io từ socket.js
    console.log("✅ WebSocket io instance set successfully");
}

module.exports = { broadcastReminderUpdate, setIoInstance };
