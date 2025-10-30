const express = require("express");
const router = express.Router();
const {
  getRevenue,
  getPaymentRate,
  getAppointmentRate,
  getDashboardOverview,
} = require("../controller/DashboardController");

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Thống kê tổng hợp cho hệ thống
 */

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Tổng hợp các chỉ số dashboard
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (ISO date)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (ISO date)
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID trung tâm dịch vụ (tùy chọn)
 *     responses:
 *       200:
 *         description: Trả về các số liệu tổng quan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     revenue:
 *                       type: number
 *                     payment:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         rate:
 *                           type: number
 *                         breakdown:
 *                           type: object
 *                           properties:
 *                             pending:
 *                               type: integer
 *                             paid:
 *                               type: integer
 *                             cancelled:
 *                               type: integer
 *                     appointment:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         breakdown:
 *                           type: object
 *                           properties:
 *                             pending:
 *                               type: integer
 *                             deposited:
 *                               type: integer
 *                             accepted:
 *                               type: integer
 *                             assigned:
 *                               type: integer
 *                             in_progress:
 *                               type: integer
 *                             completed:
 *                               type: integer
 *                             paid:
 *                               type: integer
 *                             canceled:
 *                               type: integer
 *       500:
 *         description: Lỗi server
 */
router.get("/overview", getDashboardOverview);

/**
 * @swagger
 * /api/dashboard/revenue:
 *   get:
 *     summary: Thống kê doanh thu (payments đã thanh toán)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc
 *     responses:
 *       200:
 *         description: Doanh thu và số lệnh đã hoàn tất thanh toán
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     revenue:
 *                       type: number
 *                     count:
 *                       type: integer
 *       500:
 *         description: Lỗi server
 */
router.get("/revenue", getRevenue);

/**
 * @swagger
 * /api/dashboard/payment-rate:
 *   get:
 *     summary: Tỉ lệ thanh toán (payment status breakdown)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc
 *     responses:
 *       200:
 *         description: Breakdown và tỉ lệ payment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     rate:
 *                       type: number
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                         paid:
 *                           type: integer
 *                         cancelled:
 *                           type: integer
 *       500:
 *         description: Lỗi server
 */
router.get("/payment-rate", getPaymentRate);

/**
 * @swagger
 * /api/dashboard/appointment-rate:
 *   get:
 *     summary: Tỉ lệ trạng thái các appointment
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID trung tâm dịch vụ (tuỳ chọn)
 *     responses:
 *       200:
 *         description: Breakdown trạng thái appointment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                         deposited:
 *                           type: integer
 *                         accepted:
 *                           type: integer
 *                         assigned:
 *                           type: integer
 *                         in_progress:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         paid:
 *                           type: integer
 *                         canceled:
 *                           type: integer
 *       500:
 *         description: Lỗi server
 */
router.get("/appointment-rate", getAppointmentRate);

module.exports = router;
