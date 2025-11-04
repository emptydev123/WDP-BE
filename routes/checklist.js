// routes/checklist.js
const express = require("express");
const router = express.Router();
const ChecklistController = require("../controller/ChecklistController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Checklist
 *   description: API quản lý checklist
 */

/**
 * @swagger
 * /api/checklist:
 *   get:
 *     summary: Lấy danh sách checklist
 *     tags: [Checklist]
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
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleWare, ChecklistController.getAllChecklists);

/**
 * @swagger
 * /api/checklist:
 *   post:
 *     summary: Tạo checklist mới và check-in appointment (Technician)
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointment_id
 *               - issue_type_id
 *               - issue_description
 *               - solution_applied
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 description: ID của appointment (phải có status "assigned" và chưa check-in)
 *               issue_type_id:
 *                 type: string
 *                 description: ID của issue type
 *               issue_description:
 *                 type: string
 *                 description: Mô tả chi tiết vấn đề
 *               solution_applied:
 *                 type: string
 *                 description: Giải pháp đã áp dụng
 *               parts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - part_id
 *                     - quantity
 *                   properties:
 *                     part_id:
 *                       type: string
 *                       description: ID của part
 *                     quantity:
 *                       type: number
 *                       description: Số lượng
 *                       minimum: 1
 *                 description: Danh sách parts cần sử dụng (optional)
 *     responses:
 *       201:
 *         description: Checklist created successfully and appointment checked-in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tạo checklist và check-in thành công"
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Checklist đã được tạo với appointment đã check-in
 *       400:
 *         description: Bad request - Appointment status không phải "assigned" hoặc đã được check-in
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment, IssueType, hoặc Part không tồn tại
 */
router.post("/", authMiddleWare, ChecklistController.createChecklist);

/**
 * @swagger
 * /api/checklist/{checklistId}/accept:
 *   put:
 *     summary: Staff chấp nhận checklist, cập nhật inventory và chuyển appointment status thành "in_progress"
 *     description: Khi staff chấp nhận checklist thành công, hệ thống sẽ cập nhật inventory, tính toán estimated_cost và tự động chuyển appointment status thành "in_progress"
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của checklist cần chấp nhận
 *     responses:
 *       200:
 *         description: Checklist accepted, inventory updated, appointment status changed to "in_progress"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chấp nhận checklist thành công"
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Checklist đã được accept, appointment đã chuyển sang "in_progress"
 *       400:
 *         description: Bad request - Checklist đã được xử lý hoặc không đủ inventory
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Staff role required
 *       404:
 *         description: Checklist hoặc appointment không tồn tại
 */
router.put(
  "/:checklistId/accept",
  authMiddleWare,
  ChecklistController.acceptChecklist
);

/**
 * @swagger
 * /api/checklist/{checklistId}/cancel:
 *   put:
 *     summary: Staff hủy checklist kèm note
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của checklist cần hủy
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 description: Lý do hủy checklist (optional)
 *                 example: "Phụ tùng không còn trong kho"
 *     responses:
 *       200:
 *         description: Checklist đã được hủy thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Checklist đã được hủy"
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "canceled"
 *                     cancellation_note:
 *                       type: string
 *                       description: Lý do hủy (nếu có)
 *       400:
 *         description: Checklist không thể hủy (chỉ có thể hủy checklist có status pending hoặc accepted)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied. Staff role required
 *       404:
 *         description: Checklist not found
 *       500:
 *         description: Lỗi server
 */
router.put(
  "/:checklistId/cancel",
  authMiddleWare,
  ChecklistController.cancelChecklist
);

/**
 * @swagger
 * /api/checklist/{checklistId}/complete:
 *   put:
 *     summary: Technician hoàn thành checklist
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checklist completed
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Checklist not found
 */
router.put(
  "/:checklistId/complete",
  authMiddleWare,
  ChecklistController.completeChecklist
);

/**
 * @swagger
 * /api/checklist/{checklistId}:
 *   get:
 *     summary: Lấy thông tin checklist theo ID
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của checklist
 *     responses:
 *       200:
 *         description: Lấy thông tin checklist thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     issue_type_id:
 *                       type: object
 *                       description: Thông tin issue type đã được populate
 *                     appointment_id:
 *                       type: object
 *                       description: Thông tin appointment đã được populate
 *                     issue_description:
 *                       type: string
 *                     solution_applied:
 *                       type: string
 *                     parts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           part_id:
 *                             type: object
 *                             description: Thông tin part đã được populate
 *                           quantity:
 *                             type: number
 *                     status:
 *                       type: string
 *                       enum: [pending, accepted, completed, canceled]
 *                     cancellation_note:
 *                       type: string
 *                       description: Lý do hủy (nếu có, chỉ có khi status = canceled)
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy checklist
 *       500:
 *         description: Lỗi server
 */
router.get(
  "/:checklistId",
  authMiddleWare,
  ChecklistController.getChecklistById
);

module.exports = router;
