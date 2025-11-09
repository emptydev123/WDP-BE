const serviceCenter = require("../controller/ServiceCenterController");
const serviceCenterHours = require("../controller/ServiceCenterHoursController");
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
 *               - user_id
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
 *       400:
 *         description: Dữ liệu không hợp lệ
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
 * /api/service-center/technicians:
 *   get:
 *     summary: Lấy danh sách technicians (có thể filter theo center_id)
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: center_id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID của Service Center để lọc technicians
 *     responses:
 *       200:
 *         description: Lấy danh sách technician thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy trung tâm (khi truyền center_id không hợp lệ)
 *       500:
 *         description: Lỗi server
 */
router.get(
  "/technicians",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "technician", "admin"),
  serviceCenterHours.getTechnicians
);

/**
 * @swagger
 * /api/service-center/get:
 *   get:
 *     summary: Lấy danh sách tất cả trung tâm và giờ làm việc theo từng tuần, khoảng ngày hoặc ngày cụ thể
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày cụ thể (YYYY-MM-DD). Ưu tiên cao nhất - chỉ trả về dữ liệu của ngày này. Nếu có date, sẽ bỏ qua start_date/end_date và weeks
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *           default: 4
 *         description: Số tuần muốn lấy (mặc định 4 tuần). Chỉ dùng khi không có date và start_date/end_date
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Lọc theo ID trung tâm. Khi truyền vào, response của mỗi trung tâm sẽ kèm danh sách technicians
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD). Phải đi kèm với end_date. Chỉ dùng khi không có date. Nếu là T7/CN vẫn hiển thị nhưng chỉ có 2 ngày đó
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD). Phải đi kèm với start_date. Chỉ dùng khi không có date. Nếu là T7/CN vẫn hiển thị nhưng chỉ có 2 ngày đó
 *     responses:
 *       200:
 *         description: Lấy danh sách trung tâm và giờ làm việc thành công theo từng tuần
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
 *                   example: "Lấy danh sách trung tâm và giờ làm việc thành công (4 tuần)"
 *                   description: Message phụ thuộc vào query parameter - "ngày YYYY-MM-DD" nếu có date, "từ YYYY-MM-DD đến YYYY-MM-DD" nếu có start_date/end_date, hoặc "X tuần" nếu dùng weeks
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
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       slots:
 *                         type: number
 *                         example: 16
 *                       weeks:
 *                         type: array
 *                         description: Danh sách các tuần
 *                         items:
 *                           type: object
 *                           properties:
 *                             week_number:
 *                               type: number
 *                               example: 1
 *                               description: Số thứ tự tuần (1, 2, 3, 4...)
 *                             week_start:
 *                               type: string
 *                               format: date
 *                               example: "2025-11-03"
 *                               description: Ngày bắt đầu tuần (Monday)
 *                             week_end:
 *                               type: string
 *                               format: date
 *                               example: "2025-11-07"
 *                               description: Ngày kết thúc tuần (Friday)
 *                             days:
 *                               type: array
 *                               description: Danh sách các ngày trong tuần (Monday-Friday)
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   date:
 *                                     type: string
 *                                     format: date
 *                                     example: "2025-11-03"
 *                                   day_of_week:
 *                                     type: string
 *                                     example: "Monday"
 *                                   open_time:
 *                                     type: string
 *                                     example: "08:00"
 *                                   close_time:
 *                                     type: string
 *                                     example: "17:00"
 *                                   is_close:
 *                                     type: boolean
 *                                     example: false
 *                                   totalSlots:
 *                                     type: number
 *                                     example: 16
 *                                     description: Tổng số slot của ngày này
 *                                   bookedSlots:
 *                                     type: number
 *                                     example: 4
 *                                     description: Số slot đã được đặt trong ngày này
 *                                   remainingSlots:
 *                                     type: number
 *                                     example: 12
 *                                     description: Số slot còn lại
 *                                   availableSlots:
 *                                     type: number
 *                                     example: 12
 *                                     description: Số slot khả dụng (giống remainingSlots)
 *                                   timeSlots:
 *                                     type: array
 *                                     description: Danh sách các khung giờ có thể đặt (chỉ hiển thị khung giờ đã book hoặc còn trống)
 *                                     items:
 *                                       type: object
 *                                       properties:
 *                                         time:
 *                                           type: string
 *                                           example: "09:00"
 *                                           description: Khung giờ (HH:mm)
 *                                         bookedCount:
 *                                           type: number
 *                                           example: 1
 *                                           description: Số lượng booking đã có ở khung giờ này
 *                                         isFull:
 *                                           type: boolean
 *                                           example: true
 *                                           description: Khung giờ đã đầy chưa
 *                                         available:
 *                                           type: number
 *                                           example: 0
 *                                           description: Số slot còn trống ở khung giờ này
 *                                         isBooked:
 *                                           type: boolean
 *                                           example: true
 *                                           description: Khung giờ này đã có booking chưa
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi server khi lấy danh sách trung tâm
 */
router.get(
  "/get",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "technician", "admin"),
  serviceCenterHours.getAllServiceCentersWithHours
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
/**
 * @swagger
 * /api/service-center/technican/add:
 *   post:
 *     summary: Thêm nhân viên vào trung tâm
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
 *               - user_id
 *               - center_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: ID của người dùng (nhân viên)
 *                 example: "60d5f84e5b7c6d001f8184d2"
 *               center_id:
 *                 type: string
 *                 description: ID của trung tâm
 *                 example: "60d5f84e5b7c6d001f8184d3"
 *               maxSlotsPerDay:
 *                 type: number
 *                 description: Số slot tối đa mỗi nhân viên có thể làm trong 1 ngày (mặc định là 4)
 *                 example: 4
 *               status:
 *                 type: string
 *                 enum: ["on", "off"]
 *                 description: Trạng thái làm việc của nhân viên
 *                 example: "on"
 *     responses:
 *       201:
 *         description: Nhân viên đã được thêm vào trung tâm
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy trung tâm hoặc nhân viên
 *       500:
 *         description: Lỗi server
 */
router.post(
  '/technican/add',
  auth.authMiddleWare,
  auth.requireRole('admin', 'technician', 'staff', "customer"),
  serviceCenter.addTechnicanToServiceCenter
);

/**
 * @swagger
 * /api/service-center/technican/remove:
 *   post:
 *     summary: Xóa nhân viên khỏi trung tâm
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
 *               - user_id
 *               - center_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: ID của người dùng (nhân viên)
 *                 example: "60d5f84e5b7c6d001f8184d2"
 *               center_id:
 *                 type: string
 *                 description: ID của trung tâm
 *                 example: "60d5f84e5b7c6d001f8184d3"
 *     responses:
 *       200:
 *         description: Nhân viên đã được xóa khỏi trung tâm
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy trung tâm hoặc nhân viên
 *       500:
 *         description: Lỗi server
 */
router.post(
  '/technican/remove',
  auth.authMiddleWare,
  auth.requireRole('admin', 'technician', 'staff', 'customer'),
  serviceCenter.removeTechnicanFromCenter
);
module.exports = router;
