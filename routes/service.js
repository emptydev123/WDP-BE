var service = require('../controller/ServiceController');
var express = require('express');
var router = express.Router();
const auth = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: API quản lý dịch vụ bảo dưỡng xe điện
 */

/**
 * @swagger
 * /api/service/create:
 *   post:
 *     summary: Tạo dịch vụ mới
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_name
 *               - base_price
 *             properties:
 *               service_name:
 *                 type: string
 *                 example: "Thay pin xe điện"
 *               description:
 *                 type: string
 *                 example: "Dịch vụ thay pin xe điện dung lượng cao"
 *               base_price:
 *                 type: number
 *                 example: 5000000
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               estimated_duration:
 *                 type: string
 *                 example: "2"
 *     responses:
 *       201:
 *         description: Tạo dịch vụ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post(
    "/create",
    auth.authMiddleWare,
    auth.requireRole("staff", "admin"),
    service.createService
);

/**
 * @swagger
 * /api/service/get:
 *   get:
 *     summary: Lấy danh sách dịch vụ đang hoạt động
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Lấy danh sách dịch vụ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get(
    "/get",
    auth.authMiddleWare,
    auth.requireRole("customer", "staff", "admin", "techical"),
    service.getService
);

module.exports = router
