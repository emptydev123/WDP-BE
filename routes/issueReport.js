// routes/issueReport.js
const express = require("express");
const router = express.Router();
const IssueReportController = require("../controller/IssueReportController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: IssueReports
 *   description: API quản lý báo cáo vấn đề (Issue Reports)
 */

/**
 * @swagger
 * /api/issue-reports:
 *   get:
 *     summary: Lấy danh sách issue reports
 *     tags: [IssueReports]
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
router.get("/", authMiddleWare, IssueReportController.getAllIssueReports);

/**
 * @swagger
 * /api/issue-reports/appointment/{appointment_id}:
 *   get:
 *     summary: Lấy tất cả issue reports của appointment
 *     tags: [IssueReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointment_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/appointment/:appointment_id",
  authMiddleWare,
  IssueReportController.getIssueReportsByAppointment
);

/**
 * @swagger
 * /api/issue-reports:
 *   post:
 *     summary: Tạo issue report mới (Technician)
 *     tags: [IssueReports]
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
 *               parts_used:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - part_id
 *                     - quantity
 *                     - unit_cost
 *                   properties:
 *                     part_id:
 *                       type: string
 *                       description: ID của part
 *                     quantity:
 *                       type: number
 *                       description: Số lượng
 *                       minimum: 1
 *                     unit_cost:
 *                       type: number
 *                       description: Giá tại thời điểm sử dụng
 *                 description: Danh sách parts đã sử dụng (optional)
 *     responses:
 *       201:
 *         description: Created (Issue report created and appointment status updated to completed)
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden (not assigned to appointment)
 */
router.post("/", authMiddleWare, IssueReportController.createIssueReport);

/**
 * @swagger
 * /api/issue-reports/{reportId}:
 *   put:
 *     summary: Cập nhật issue report
 *     tags: [IssueReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               issue_type_id:
 *                 type: string
 *               issue_description:
 *                 type: string
 *               solution_applied:
 *                 type: string
 *               parts_used:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     part_id:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unit_cost:
 *                       type: number
 *     responses:
 *       200:
 *         description: Updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Report not found
 */
router.put(
  "/:reportId",
  authMiddleWare,
  IssueReportController.updateIssueReport
);

/**
 * @swagger
 * /api/issue-reports/{reportId}:
 *   delete:
 *     summary: Xóa issue report
 *     tags: [IssueReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Report not found
 */
router.delete(
  "/:reportId",
  authMiddleWare,
  IssueReportController.deleteIssueReport
);

module.exports = router;
