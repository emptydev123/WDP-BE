// routes/notification.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controller/NotificationController');
const { authMiddleWare } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API quản lý nhắc nhở (Notifications)
 */

/**
 * @swagger
 * /api/notifications/get:
 *   get:
 *     summary: Lấy danh sách notifications (nhắc nhở)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Get data successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       vehicle_id:
 *                         type: object
 *                         properties:
 *                           license_plate:
 *                             type: string
 *                             example: "ABC123"
 *                       due_date:
 *                         type: string
 *                         format: date
 *                         example: "2025-10-27T00:00:00Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lỗi không thể lấy data
 */
router.get('/get', authMiddleWare, notificationController.getNotification);

module.exports = router;
