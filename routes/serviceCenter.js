const serviceCenter = require("../controller/ServiceCenterController");
var express = require("express");
var router = express.Router();
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Service Center
 *   description: API quản lý trung tâm dịch vụ và lịch làm việc
 */

/**
 * @swagger
 * /api/service-center/create:
 *   post:
 *     summary: Tạo trung tâm dịch vụ mới
 *     tags: [Service Center]
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
 *               - address
 *               - phone
 *               - email
 *             properties:
 *               center_name:
 *                 type: string
 *                 example: "EV Hà Nội"
 *               address:
 *                 type: string
 *                 example: "123 Nguyễn Văn Cừ, Long Biên, Hà Nội"
 *               phone:
 *                 type: string
 *                 example: "0987654321"
 *               email:
 *                 type: string
 *                 example: "evcenter@gmail.com"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Tạo Service Center thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post(
  "/create",
  auth.authMiddleWare,
  auth.requireRole("admin", "staff", "customer"),
  serviceCenter.createServiceCenter
);

/**
 * @swagger
 * /api/service-center/schedule/create/{id}:
 *   post:
 *     summary: Tạo lịch làm việc cho trung tâm
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của trung tâm cần tạo lịch làm việc
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - day_of_week
 *               - open_time
 *               - close_time
 *             properties:
 *               day_of_week:
 *                 type: string
 *                 example: "Monday"
 *               open_time:
 *                 type: string
 *                 example: "08:00"
 *               close_time:
 *                 type: string
 *                 example: "17:00"
 *               is_close:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       202:
 *         description: Tạo lịch làm việc trung tâm thành công
 *       404:
 *         description: Không tìm thấy trung tâm
 *       500:
 *         description: Lỗi server
 */
router.post(
  "/schedule/create/:id",
  auth.authMiddleWare,
  auth.requireRole("admin", "technician", "staff"),
  serviceCenter.createServiceCenterSchedule
);

/**
 * @swagger
 * /api/service-center/get:
 *   get:
 *     summary: Lấy danh sách tất cả trung tâm và giờ làm việc
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Lấy danh sách trung tâm và giờ làm việc thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Danh sách trung tâm và giờ làm việc"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "670feebd8b5326fbe3a9b1a7"
 *                       center_name:
 *                         type: string
 *                         example: "EV Hà Nội"
 *                       address:
 *                         type: string
 *                         example: "123 Nguyễn Văn Cừ, Long Biên, Hà Nội"
 *                       phone:
 *                         type: string
 *                         example: "0987654321"
 *                       email:
 *                         type: string
 *                         example: "evcenter@gmail.com"
 *                       working_hours:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             day_of_week:
 *                               type: string
 *                               example: "Monday"
 *                             open_time:
 *                               type: string
 *                               example: "08:00"
 *                             close_time:
 *                               type: string
 *                               example: "17:00"
 *                             is_close:
 *                               type: boolean
 *                               example: false
 *       500:
 *         description: Lỗi server khi lấy danh sách trung tâm
 */
router.get(
  "/get",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "technician", "admin"),
  serviceCenter.getAllServiceCenters
);

/**
 * @swagger
 * /api/service-center/update/{id}:
 *   put:
 *     summary: Cập nhật thông tin trung tâm dịch vụ
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID của trung tâm cần cập nhật
 *         required: true
 *         schema:
 *           type: string
 *           example: "670feebd8b5326fbe3a9b1a7"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               center_name:
 *                 type: string
 *                 example: "EV Sài Gòn"
 *               address:
 *                 type: string
 *                 example: "123 Nguyễn Văn Cừ, Quận 5, TP.HCM"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               email:
 *                 type: string
 *                 example: "contact@evsaigon.vn"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Cập nhật trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Cập nhật trung tâm thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "670feebd8b5326fbe3a9b1a7"
 *                     center_name:
 *                       type: string
 *                       example: "EV Sài Gòn"
 *                     address:
 *                       type: string
 *                       example: "123 Nguyễn Văn Cừ, Quận 5, TP.HCM"
 *                     phone:
 *                       type: string
 *                       example: "0901234567"
 *                     email:
 *                       type: string
 *                       example: "contact@evsaigon.vn"
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Không thể cập nhật do đã có lịch hẹn
 *       404:
 *         description: Không tìm thấy trung tâm
 *       500:
 *         description: Lỗi server khi cập nhật trung tâm
 */
router.put(
  "/update/:id",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin", "staff"),
  serviceCenter.updateServiceCenter
);

/**
 * @swagger
 * /api/service-center/delete/{id}:
 *   delete:
 *     summary: Xóa trung tâm dịch vụ
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID của trung tâm cần xóa
 *         required: true
 *         schema:
 *           type: string
 *           example: "670feebd8b5326fbe3a9b1a7"
 *     responses:
 *       200:
 *         description: Xóa trung tâm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Xóa trung tâm thành công"
 *       400:
 *         description: Không thể xóa trung tâm vì đã có lịch hẹn
 *       404:
 *         description: Không tìm thấy trung tâm
 *       500:
 *         description: Lỗi server khi xóa trung tâm
 */
router.delete(
  "/delete/:id",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin", "staff"),
  serviceCenter.deleteServiceCenter
);
module.exports = router;
