const express = require("express");
const router = express.Router();
const serviceCenter = require("../controller/ServiceCenterController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: ServiceCenters
 *   description: Quản lý service centers
 */

/**
 * @swagger
 * /api/service-centers:
 *   get:
 *     summary: Lấy danh sách service centers
 *     tags: [ServiceCenters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, địa chỉ
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *           default: true
 *         description: Lọc theo trạng thái hoạt động
 *     responses:
 *       200:
 *         description: Lấy danh sách service centers thành công
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", auth.authMiddleWare, serviceCenter.getAllServiceCenters);

/**
 * @swagger
 * /api/service-centers/{centerId}:
 *   get:
 *     summary: Lấy thông tin service center theo ID
 *     tags: [ServiceCenters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service Center ID
 *     responses:
 *       200:
 *         description: Lấy thông tin service center thành công
 *       404:
 *         description: Service center không tìm thấy
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/:centerId",
  auth.authMiddleWare,
  serviceCenter.getServiceCenterById
);

/**
 * @swagger
 * /api/service-centers:
 *   post:
 *     summary: Tạo service center mới
 *     tags: [ServiceCenters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - center_name
 *               - user_id
 *             properties:
 *               center_name:
 *                 type: string
 *                 example: "Trung tâm dịch vụ Hà Nội"
 *               address:
 *                 type: string
 *                 example: "123 Đường ABC, Quận XYZ, Hà Nội"
 *               user_id:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *     responses:
 *       201:
 *         description: Tạo service center thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc hoặc tên đã tồn tại
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User không tìm thấy
 *       500:
 *         description: Server error
 */
router.post("/", auth.authMiddleWare, serviceCenter.createServiceCenter);

/**
 * @swagger
 * /api/service-centers/{centerId}:
 *   put:
 *     summary: Cập nhật service center (bao gồm deactivate/reactivate)
 *     tags: [ServiceCenters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: centerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service Center ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               center_name:
 *                 type: string
 *                 example: "Trung tâm dịch vụ Hà Nội Updated"
 *               address:
 *                 type: string
 *                 example: "456 Đường XYZ, Quận ABC, Hà Nội"
 *               user_id:
 *                 type: string
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b4"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *                 description: "true = hoạt động, false = deactivate (soft delete)"
 *     responses:
 *       200:
 *         description: Cập nhật service center thành công
 *       400:
 *         description: Tên service center đã tồn tại
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service center hoặc user không tìm thấy
 *       500:
 *         description: Server error
 */
router.put(
  "/:centerId",
  auth.authMiddleWare,
  serviceCenter.updateServiceCenter
);

module.exports = router;
