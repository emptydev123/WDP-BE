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
 * /api/dashboard/revenue:
 *   get:
 *     summary: Doanh thu từ Payments (PAID)
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
 *     responses:
 *       200:
 *         description: Doanh thu thành công
 */
router.get("/revenue", authMiddleWare, DashboardController.getRevenue);

/**
 * @swagger
 * /api/dashboard/payment-rate:
 *   get:
 *     summary: Tỉ lệ thanh toán
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
 *     responses:
 *       200:
 *         description: Tỉ lệ thanh toán thành công
 */
router.get("/payment-rate", authMiddleWare, DashboardController.getPaymentRate);

/**
 * @swagger
 * /api/dashboard/appointment-rate:
 *   get:
 *     summary: Tỉ lệ của appointment (theo status)
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
 *         description: Tỉ lệ appointment thành công
 */
router.get(
  "/appointment-rate",
  authMiddleWare,
  DashboardController.getAppointmentRate
);

/**
 * @swagger
 * /api/dashboard/checkin-rate:
 *   get:
 *     summary: Tỷ lệ check-in
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
 *         name: appointment_id
 *         schema:
 *           type: string
 *         description: Lọc theo appointment ID
 *     responses:
 *       200:
 *         description: Tỷ lệ check-in thành công
 */
router.get("/checkin-rate", authMiddleWare, DashboardController.getCheckinRate);

module.exports = router;
