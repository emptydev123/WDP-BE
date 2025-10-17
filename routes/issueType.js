// routes/issueType.js
const express = require("express");
const router = express.Router();
const IssueTypeController = require("../controller/IssueTypeController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: IssueTypes
 *   description: API quản lý loại vấn đề (Issue Types)
 */

/**
 * @swagger
 * /api/issue-types:
 *   get:
 *     summary: Lấy danh sách issue types
 *     tags: [IssueTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [battery, motor, charging, brake, cooling, electrical, software, mechanical, suspension, tire, other]
 *         description: Lọc theo category
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [minor, moderate, major, critical]
 *         description: Lọc theo severity
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleWare, IssueTypeController.getAllIssueTypes);

/**
 * @swagger
 * /api/issue-types/{issueTypeId}:
 *   get:
 *     summary: Lấy chi tiết issue type
 *     tags: [IssueTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issueTypeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Issue Type ID
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Issue type not found
 */
router.get(
  "/:issueTypeId",
  authMiddleWare,
  IssueTypeController.getIssueTypeById
);

/**
 * @swagger
 * /api/issue-types:
 *   post:
 *     summary: Tạo issue type mới (Admin/Staff)
 *     tags: [IssueTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - severity
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [battery, motor, charging, brake, cooling, electrical, software, mechanical, suspension, tire, other]
 *               severity:
 *                 type: string
 *                 enum: [minor, moderate, major, critical]
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad request (duplicate or missing fields)
 */
router.post("/", authMiddleWare, IssueTypeController.createIssueType);

/**
 * @swagger
 * /api/issue-types/{issueTypeId}:
 *   put:
 *     summary: Cập nhật issue type (Admin/Staff)
 *     tags: [IssueTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issueTypeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [battery, motor, charging, brake, cooling, electrical, software, mechanical, suspension, tire, other]
 *               severity:
 *                 type: string
 *                 enum: [minor, moderate, major, critical]
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Issue type not found
 */
router.put(
  "/:issueTypeId",
  authMiddleWare,
  IssueTypeController.updateIssueType
);

/**
 * @swagger
 * /api/issue-types/{issueTypeId}:
 *   delete:
 *     summary: Xóa issue type (Admin)
 *     tags: [IssueTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issueTypeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       400:
 *         description: Cannot delete (in use by issue reports)
 *       404:
 *         description: Issue type not found
 */
router.delete(
  "/:issueTypeId",
  authMiddleWare,
  IssueTypeController.deleteIssueType
);

module.exports = router;
