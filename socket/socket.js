// socket.js
const { Server } = require("socket.io");

function initializeSocketServer(server) {
    const io = new Server(server, {
        cors: {
            origin: "*",  // Cho phép tất cả origins (development)
            methods: ["GET", "POST"],
            credentials: true
        },
    });

    io.on("connection", (socket) => {
        console.log(`✅ User connected: ${socket.id}`);
        socket.emit("message", "Chào từ Server!");

        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.id}`);
        });

        // Log khi nhận được event từ client
        socket.onAny((event, ...args) => {
            console.log(`📨 Received event: ${event}`, args);
        });
    });

    console.log("🔌 Socket.IO server initialized");
    return io;  // Trả về instance io
}

module.exports = { initializeSocketServer };
