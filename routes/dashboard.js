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
 *     summary: Danh sách hãng xe sửa nhiều nhất (sắp xếp từ cao xuống thấp)
 *     description: |
 *       - Không truyền gì: Lấy tất cả danh sách hãng xe sắp xếp từ cao xuống thấp
 *       - Có filter: Lọc và sắp xếp từ cao xuống thấp
 *       - Nếu có vehicle_id: Lọc theo xe nào đến sửa nhiều nhất (theo vehicle_id)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Nếu không có thì lấy tất cả
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Nếu không có thì lấy tất cả
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *         description: Lọc theo trạng thái appointment. Nếu không truyền thì lấy tất cả
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *         description: Lọc theo vehicle_id để xem xe nào đến sửa nhiều nhất
 *     responses:
 *       200:
 *         description: Danh sách hãng xe hoặc xe sửa nhiều nhất (sắp xếp từ cao xuống thấp)
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
 *     summary: Danh sách phụ tùng thay nhiều nhất (sắp xếp từ cao xuống thấp)
 *     description: |
 *       - Không truyền gì: Lấy tất cả danh sách phụ tùng sắp xếp từ cao xuống thấp
 *       - Có filter: Lọc và sắp xếp từ cao xuống thấp
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Nếu không có thì lấy tất cả
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Nếu không có thì lấy tất cả
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, completed, canceled]
 *         description: Lọc theo trạng thái checklist. Nếu không truyền thì lấy tất cả
 *     responses:
 *       200:
 *         description: Danh sách phụ tùng thay nhiều nhất (sắp xếp từ cao xuống thấp)
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
 *     summary: Danh sách nhân viên có nhiều appointment nhất (sắp xếp từ cao xuống thấp)
 *     description: |
 *       - Không truyền gì: Lấy tất cả danh sách nhân viên sắp xếp từ cao xuống thấp
 *       - Có filter: Lọc và sắp xếp từ cao xuống thấp
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Nếu không có thì lấy tất cả
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Nếu không có thì lấy tất cả
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *         description: Lọc theo trạng thái appointment. Nếu không truyền thì lấy tất cả
 *     responses:
 *       200:
 *         description: Danh sách nhân viên có nhiều appointment nhất (sắp xếp từ cao xuống thấp)
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
 *     summary: Danh sách nhân viên kiếm nhiều tiền nhất (sắp xếp từ cao xuống thấp)
 *     description: |
 *       - Không truyền gì: Lấy tất cả danh sách nhân viên sắp xếp từ cao xuống thấp
 *       - Có filter: Lọc và sắp xếp từ cao xuống thấp
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Nếu không có thì lấy tất cả
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Nếu không có thì lấy tất cả
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo Service Center ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *         description: Lọc theo trạng thái appointment. Nếu không truyền thì lấy tất cả
 *     responses:
 *       200:
 *         description: Danh sách nhân viên kiếm nhiều tiền nhất (sắp xếp từ cao xuống thấp)
 */
router.get(
  "/top-technicians-revenue",
  authMiddleWare,
  DashboardController.getTopTechniciansByRevenue
);

module.exports = router;
