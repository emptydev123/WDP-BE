# 🔌 WebSocket Real-time Testing Guide

## ✅ Những gì đã được sửa:

### 1. **Socket.IO Configuration** (`socket/socket.js`)

- ✅ Cho phép tất cả origins (`*`)
- ✅ Thêm logging chi tiết cho connection/disconnection
- ✅ Xử lý tất cả events từ client

### 2. **Reminder Event Handler** (`socket/reminderEvent.js`)

- ✅ Error handling tốt hơn
- ✅ Logging chi tiết khi broadcast
- ✅ Safe handling nếu io chưa được khởi tạo
- ✅ Data validation với optional chaining

### 3. **Reminder Job** (`job/reminderJob.js`)

- ✅ Try-catch cho từng reminder
- ✅ Logging chi tiết mỗi bước
- ✅ Đảm bảo broadcast TRƯỚC khi set is_sent

### 4. **Server Initialization** (`bin/www`)

- ✅ Set io instance ngay sau khi khởi tạo
- ✅ Initialize reminder job sau khi server ready
- ✅ Logging rõ ràng

## 🧪 Cách Test:

### **Cách 1: Dùng file HTML test**

1. Mở file `test-socket.html` trong browser
2. Click "Connect"
3. Mở terminal và check log

### **Cách 2: Test thủ công**

```javascript
// Trong browser console hoặc Postman
const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("reminderSent", (data) => {
  console.log("Reminder received:", data);
});
```

### **Cách 3: Test với data thật**

1. Tạo một reminder trong database có `due_date = today` và `is_sent = false`
2. Restart server hoặc đợi đến 7h sáng
3. Reminder sẽ được gửi real-time qua WebSocket

## 📊 Flow hoạt động:

```
1. Server Start
   ↓
2. Initialize Socket.IO → io
   ↓
3. Set io instance to reminderEvent
   ↓
4. Connect to MongoDB
   ↓
5. Listen on port
   ↓
6. Run checkDueReminders() (chạy ngay khi start)
   ↓
7. Tìm reminders có due_date <= today && is_sent = false
   ↓
8. Broadcast qua WebSocket (io.emit)
   ↓
9. Set is_sent = true
   ↓
10. Lặp lại mỗi 7h sáng (cron job)
```

## 🎯 Event để listen ở Frontend:

```javascript
socket.on("reminderSent", (data) => {
  console.log("Reminder data:", data);
  // data = {
  //   message: "...",
  //   vehicle: "ABC123",
  //   due_date: "2024-01-01",
  //   reminder_id: "...",
  //   type: "maintenance_reminder"
  // }
});
```

## ✅ Checklist:

- [x] Socket.IO initialization
- [x] Connection handling
- [x] Error handling
- [x] Broadcast reminder events
- [x] Cron job chạy mỗi 7h
- [x] Quét ngay khi start server
- [x] Không bị duplicate (is_sent flag)
- [x] Real-time notification

## 🚨 Lưu ý:

- CORS đang set `origin: "*"` (development mode)
- Trong production nên chỉ định specific origins
- WebSocket port: same as HTTP server (5000)
