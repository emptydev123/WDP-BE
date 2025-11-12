const express = require('express');
const router = express.Router();
const ChatController = require('../controller/ChatController');
const auth = require('../middlewares/auth');

// Lấy lịch sử chat giữa user hiện tại và user khác
router.get('/history/:otherId', auth.authMiddleWare, auth.requireRole('customer','staff','admin'), ChatController.getChatHistory);
// Lấy danh sách user đã từng chat với current user
router.get('/partners', auth.authMiddleWare, auth.requireRole('customer','staff','admin'), ChatController.getChatPartners);
// Gửi tin nhắn
router.post('/send', auth.authMiddleWare, auth.requireRole('customer','staff','admin'), ChatController.sendMessage);

module.exports = router;
