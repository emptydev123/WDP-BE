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
 *     summary: Tạo checklist mới (Technician)
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
 *                 description: ID của appointment
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
 *         description: Created (Checklist created with pending status)
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden (not assigned to appointment)
 */
router.post("/", authMiddleWare, ChecklistController.createChecklist);

/**
 * @swagger
 * /api/checklist/{checklistId}/accept:
 *   put:
 *     summary: Staff chấp nhận checklist và cập nhật inventory
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
 *         description: Checklist accepted, inventory updated
 *       400:
 *         description: Bad request or insufficient inventory
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Staff role required
 *       404:
 *         description: Checklist not found
 */
router.put(
  "/:checklistId/accept",
  authMiddleWare,
  ChecklistController.acceptChecklist
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

module.exports = router;
