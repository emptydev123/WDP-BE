// routes/checkin.js
const express = require("express");
const router = express.Router();
const CheckinController = require("../controller/CheckinController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Checkin
 *   description: API quản lý check-in cho appointments
 */

/**
 * @swagger
 * /api/checkin:
 *   get:
 *     summary: Lấy danh sách checkin (có filter theo appointment_id)
 *     tags: [Checkin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: appointment_id
 *         schema:
 *           type: string
 *         description: Lọc theo appointment ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [arrival, return, pickup]
 *         description: Lọc theo loại check-in
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [on_time, early, late, delay]
 *         description: Lọc theo trạng thái check-in
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleWare, CheckinController.getAllCheckins);

/**
 * @swagger
 * /api/checkin/{appointmentId}:
 *   post:
 *     summary: Tạo checkin mới cho appointment
 *     tags: [Checkin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của appointment
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Ghi chú khi checkin
 *               checkin_type:
 *                 type: string
 *                 enum: [arrival, return, pickup]
 *                 default: arrival
 *                 description: Loại check-in (đến lần đầu, trả lại, nhận xe)
 *               isDelay:
 *                 type: boolean
 *                 default: false
 *                 description: Có delay hay không (nếu true thì status = delay)
 *     responses:
 *       201:
 *         description: Checkin thành công (nếu isDelay=true hoặc muộn > 30ph thì appointment status = delay)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Không có quyền checkin appointment này
 *       404:
 *         description: Không tìm thấy appointment
 */
router.post("/:appointmentId", authMiddleWare, CheckinController.createCheckin);

module.exports = router;
