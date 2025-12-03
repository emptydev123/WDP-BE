// routes/ai.js
var express = require("express");
var router = express.Router();
const AIController = require("../controller/AIController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * /api/ai/inventory/forecast:
 *   get:
 *     summary: Dự đoán nhu cầu phụ tùng (AI Inventory Forecasting)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID của service center (optional)
 *       - in: query
 *         name: days_ahead
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Số ngày dự đoán trong tương lai
 *     responses:
 *       200:
 *         description: Dự đoán thành công
       401:
         description: Unauthorized
 */
router.get("/inventory/forecast", authMiddleWare, AIController.forecastInventoryDemand);

/**
 * @swagger
 * /api/ai/parts/recommend:
 *   get:
 *     summary: Gợi ý phụ tùng cho issue type (AI Parts Recommendation)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: issue_type_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của issue type
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *         description: ID của vehicle (optional)
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID của service center để check availability
 *     responses:
 *       200:
 *         description: Gợi ý thành công
 *       400:
 *         description: Thiếu issue_type_id
       401:
         description: Unauthorized
 */
router.get("/parts/recommend", authMiddleWare, AIController.recommendPartsForIssue);

/**
 * @swagger
 * /api/ai/issues/trends:
 *   get:
 *     summary: Phân tích xu hướng sự cố (AI Issue Trend Analysis)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID của service center (optional)
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Số ngày phân tích trong quá khứ
 *       - in: query
 *         name: vehicle_model_id
 *         schema:
 *           type: string
 *         description: ID của vehicle model (optional)
 *     responses:
 *       200:
 *         description: Phân tích thành công
 *       401:
 *         description: Unauthorized
 */
router.get("/issues/trends", authMiddleWare, AIController.analyzeIssueTrends);

/**
 * @swagger
 * /api/ai/inventory/optimize:
 *   get:
 *     summary: Đề xuất tối ưu hóa inventory (AI Optimization)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID của service center (optional)
 *     responses:
 *       200:
 *         description: Lấy đề xuất thành công
 *       401:
 *         description: Unauthorized
 */
router.get("/inventory/optimize", authMiddleWare, AIController.getInventoryOptimizationSuggestions);

/**
 * @swagger
 * /api/ai/checklist/suggestions:
 *   get:
 *     summary: Gợi ý giải pháp, mô tả, phụ tùng cho checklist (AI Checklist Suggestions)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: issue_type_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của issue type
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *         description: ID của vehicle (optional)
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID của service center để check availability
 *     responses:
 *       200:
 *         description: Gợi ý thành công
 *       400:
 *         description: Thiếu issue_type_id
 *       401:
 *         description: Unauthorized
 */
router.get("/checklist/suggestions", authMiddleWare, AIController.getChecklistSuggestions);

module.exports = router;
