// routes/notification.js
const express = require("express");
const router = express.Router();
const notificationController = require("../controller/NotificationController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API for managing notifications
 */

/**
 * @swagger
 * /api/notifications/get:
 *   get:
 *     summary: Get list of notifications
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
 *                   example: Error unable to retrieve data
 */
router.get("/get", authMiddleWare, notificationController.getNotification);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Internal Server Error
 */
router.patch("/read-all", authMiddleWare, notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Notification not found
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
router.patch(
  "/:notificationId/read",
  authMiddleWare,
  notificationController.markAsRead
);

module.exports = router;
