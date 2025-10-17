// routes/parts.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const {
  getAllParts,
  getPartById,
  createPart,
  updatePart,
  deletePart,
} = require("../controller/PartController");

/**
 * @swagger
 * tags:
 *   name: Parts
 *   description: API quản lý phụ tùng
 */

/**
 * @swagger
 * /api/parts:
 *   get:
 *     summary: Lấy danh sách parts
 *     tags: [Parts]
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
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, số part hoặc mô tả
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
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", auth.authMiddleWare, getAllParts);

/**
 * @swagger
 * /api/parts/{partId}:
 *   get:
 *     summary: Lấy chi tiết part
 *     tags: [Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partId
 *         required: true
 *         schema:
 *           type: string
 *         description: Part ID
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
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Part not found
 *       500:
 *         description: Server error
 */
router.get("/:partId", auth.authMiddleWare, getPartById);

/**
 * @swagger
 * /api/parts:
 *   post:
 *     summary: Tạo part mới
 *     tags: [Parts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - part_name
 *               - cost_price
 *               - unit_price
 *             properties:
 *               part_number:
 *                 type: string
 *                 description: Số part
 *               part_name:
 *                 type: string
 *                 description: Tên part
 *               description:
 *                 type: string
 *                 description: Mô tả
 *               cost_price:
 *                 type: number
 *                 description: Giá gốc/giá nhập (required)
 *               unit_price:
 *                 type: number
 *                 description: Giá bán (required)
 *               supplier:
 *                 type: string
 *                 description: Nhà cung cấp
 *               warranty_month:
 *                 type: number
 *                 description: Bảo hành (tháng)
 *     responses:
 *       201:
 *         description: Part created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/", auth.authMiddleWare, createPart);

/**
 * @swagger
 * /api/parts/{partId}:
 *   put:
 *     summary: Cập nhật part
 *     tags: [Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partId
 *         required: true
 *         schema:
 *           type: string
 *         description: Part ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               part_number:
 *                 type: string
 *                 description: Số part
 *               part_name:
 *                 type: string
 *                 description: Tên part
 *               description:
 *                 type: string
 *                 description: Mô tả
 *               cost_price:
 *                 type: number
 *                 description: Giá gốc/giá nhập
 *               unit_price:
 *                 type: number
 *                 description: Giá bán
 *               supplier:
 *                 type: string
 *                 description: Nhà cung cấp
 *               warranty_month:
 *                 type: number
 *                 description: Bảo hành (tháng)
 *     responses:
 *       200:
 *         description: Part updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Part not found
 *       500:
 *         description: Server error
 */
router.put("/:partId", auth.authMiddleWare, updatePart);

/**
 * @swagger
 * /api/parts/{partId}:
 *   delete:
 *     summary: Xóa part
 *     tags: [Parts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partId
 *         required: true
 *         schema:
 *           type: string
 *         description: Part ID
 *     responses:
 *       200:
 *         description: Part deleted successfully
 *       404:
 *         description: Part not found
 *       500:
 *         description: Server error
 */
router.delete("/:partId", auth.authMiddleWare, deletePart);

module.exports = router;
