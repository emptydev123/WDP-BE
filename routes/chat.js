const express = require("express");
const router = express.Router();
const ChatController = require("../controller/ChatController");
const auth = require("../middlewares/auth");

// Get chat history between current user and another user
router.get(
  "/history/:otherId",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  ChatController.getChatHistory
);
// Get list of users who have chatted with current user
router.get(
  "/partners",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  ChatController.getChatPartners
);
// Upload attachment
router.post(
  "/upload",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  ChatController.uploadChatFile
);
// Send message
router.post(
  "/send",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  ChatController.sendMessage
);

module.exports = router;
