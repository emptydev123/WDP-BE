// routes/dashboard.js
const express = require("express");
const router = express.Router();
const DashboardController = require("../controller/DashboardController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: API dashboard thống kê
 */

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Dashboard tổng hợp (tất cả metrics)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD)
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *     responses:
 *       200:
 *         description: Dashboard overview với đầy đủ metrics
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/overview",
  authMiddleWare,
  DashboardController.getDashboardOverview
);

/**
 * @swagger
 * /api/dashboard/top-brands:
 *   get:
 *     summary: Top 5 hãng xe sửa nhiều nhất (mặc định 3 tuần, có thể filter theo thời gian)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Nếu không có, mặc định là 3 tuần trước
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Nếu không có, mặc định là hôm nay
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *     responses:
 *       200:
 *         description: Top 5 hãng xe sửa nhiều nhất
 */
router.get(
  "/top-brands",
  authMiddleWare,
  DashboardController.getTopBrandsByRepairs
);

/**
 * @swagger
 * /api/dashboard/top-parts:
 *   get:
 *     summary: Top 5 phụ tùng thay nhiều nhất (mặc định tháng này, có thể filter theo thời gian)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Nếu không có, mặc định là đầu tháng này
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Nếu không có, mặc định là hôm nay
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *     responses:
 *       200:
 *         description: Top 5 phụ tùng thay nhiều nhất
 */
router.get(
  "/top-parts",
  authMiddleWare,
  DashboardController.getTopPartsReplaced
);

/**
 * @swagger
 * /api/dashboard/top-technicians-appointments:
 *   get:
 *     summary: Top 5 nhân viên có nhiều appointment nhất (mặc định 30 ngày, có thể filter theo thời gian)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Nếu không có, mặc định là 30 ngày trước
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Nếu không có, mặc định là hôm nay
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *     responses:
 *       200:
 *         description: Top 5 nhân viên có nhiều appointment nhất
 */
router.get(
  "/top-technicians-appointments",
  authMiddleWare,
  DashboardController.getTopTechniciansByAppointments
);

/**
 * @swagger
 * /api/dashboard/top-technicians-revenue:
 *   get:
 *     summary: Top 5 nhân viên kiếm nhiều tiền nhất (mặc định 30 ngày, có thể filter theo thời gian)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Nếu không có, mặc định là 30 ngày trước
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Nếu không có, mặc định là hôm nay
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *     responses:
 *       200:
 *         description: Danh sách nhân viên kiếm nhiều tiền nhất
 */
router.get(
  "/top-technicians-revenue",
  authMiddleWare,
  DashboardController.getTopTechniciansByRevenue
);

module.exports = router;
