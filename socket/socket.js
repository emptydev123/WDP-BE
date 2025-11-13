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
        console.log(`User connected: ${socket.id}`);

        // Client gửi userId để join room riêng
        socket.on("join", (userId) => {
            socket.join(userId);
            console.log(`User ${userId} joined their room`);
        });

        // Nhận tin nhắn từ client và phát cho receiver
        socket.on("chat_message", (data) => {
            // data: { sender, receiver, content }
            io.to(data.receiver).emit("new_message", data);
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });

        // Log khi nhận được event từ client
        socket.onAny((event, ...args) => {
            console.log(`Received event: ${event}`, args);
        });
    });

    console.log("Socket.IO server initialized");
    return io;  // Trả về instance io
}

module.exports = { initializeSocketServer };
