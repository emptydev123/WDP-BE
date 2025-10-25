var express = require("express");
var router = express.Router();
const appointment = require("../controller/AppointmentController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: API quản lý appointment (Staff side)
 */

/**
 * @swagger
 * /api/appointment/list:
 *   get:
 *     summary: Xem danh sách appointment từ khách hàng
 *     tags: [Appointments]
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
 *         description: Số item per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accept, deposited, completed, paid, canceled]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: service_center_id
 *         schema:
 *           type: string
 *         description: Lọc theo service center
 *       - in: query
 *         name: technician_id
 *         schema:
 *           type: string
 *         description: Lọc theo technician ID
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *         description: Lọc theo customer ID
 *       - in: query
 *         name: is_working_now
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Lọc technician đang làm việc (thời gian thực)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-15"
 *         description: Lọc theo ngày cụ thể (YYYY-MM-DD)
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-01"
 *         description: Lọc từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-31"
 *         description: Lọc đến ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lấy danh sách appointment thành công
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
 *                     appointments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           user_id:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               username:
 *                                 type: string
 *                               fullName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                           center_id:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                           vehicle_id:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               license_plate:
 *                                 type: string
 *                               brand:
 *                                 type: string
 *                               model:
 *                                 type: string
 *                               year:
 *                                 type: number
 *                           assigned_technician:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               username:
 *                                 type: string
 *                               fullName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                           appointment_date:
 *                             type: string
 *                             format: date-time
 *
 *                           status:
 *                             type: string
 *                           service_type:
 *                             type: string
 *                           notes:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current_page:
 *                           type: integer
 *                         total_pages:
 *                           type: integer
 *                         total_items:
 *                           type: integer
 *                         items_per_page:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi server
 */
router.get(
  "/list",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  appointment.getAppointments
);

/**
 * @swagger
 * /api/appointment/create:
 *   post:
 *     summary: Tạo appointment mới (có kiểm tra điều kiện nâng cao + chọn kỹ thuật viên tùy chọn)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appoinment_date
 *               - appoinment_time
 *               - user_id
 *               - vehicle_id
 *               - center_id
 *               - service_type_id
 *             properties:
 *               appoinment_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-12"
 *                 description: Ngày hẹn (bắt buộc)
 *               appoinment_time:
 *                 type: string
 *                 example: "09:00"
 *                 description: Giờ hẹn (bắt buộc)
 *               notes:
 *                 type: string
 *                 example: "Bảo dưỡng định kỳ xe điện VinFast"
 *                 description: Ghi chú thêm (optional)
 *               user_id:
 *                 type: string
 *                 example: "66e4e34293dfe03972909142"
 *                 description: ID người dùng (bắt buộc)
 *               vehicle_id:
 *                 type: string
 *                 example: "66e0f04908abb1b3a1334e53"
 *                 description: ID xe cần bảo dưỡng (bắt buộc)
 *               center_id:
 *                 type: string
 *                 example: "66e0f04908abb1b3a1334e54"
 *                 description: ID trung tâm bảo dưỡng (bắt buộc)
 *               service_type_id:
 *                 type: string
 *                 example: "66e0f04908abb1b3a1334e56"
 *                 description: ID loại dịch vụ bảo dưỡng (bắt buộc)
 *               technician_id:
 *                 type: string
 *                 example: "670a5c290fa49362a0536e27"
 *                 description: ID kỹ thuật viên được chọn (optional – có thể bỏ trống)
 *     responses:
 *       201:
 *         description: Tạo appointment thành công (đã tạo payment tạm ứng 2000 VND)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tạo appointment thành công và tạo payment link tạm ứng"
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Thông tin đầy đủ của appointment sau khi tạo
 *                   properties:
 *                     _id:
 *                       type: string
 *                     appoinment_date:
 *                       type: string
 *                       format: date-time
 *                     appoinment_time:
 *                       type: string
 *                     status:
 *                       type: string
 *                     estimated_cost:
 *                       type: number
 *                     user_id:
 *                       type: object
 *                       description: Thông tin người đặt
 *                     vehicle_id:
 *                       type: object
 *                       description: Thông tin xe
 *                     center_id:
 *                       type: object
 *                       description: Thông tin trung tâm bảo dưỡng
 *                     service_type_id:
 *                       type: object
 *                       description: Thông tin loại dịch vụ
 *                     technician_id:
 *                       type: object
 *                       description: Kỹ thuật viên được chỉ định (nếu có)
 *                     payment_id:
 *                       type: object
 *                       description: Thông tin thanh toán tạm ứng
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Thiếu thông tin bắt buộc hoặc vi phạm quy tắc đặt lịch
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy user, vehicle, service center hoặc service type
 *       500:
 *         description: Lỗi server khi tạo appointment
 */
router.post(
  "/create",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin", "staff", "technical"),
  appointment.createAppointment
);

/**
 * @swagger
 * /api/appointment/technician-schedule:
 *   get:
 *     summary: Xem lịch làm việc của technician(s)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: technician_id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID của technician (nếu không có thì lấy tất cả technician)
 *       - in: query
 *         name: date_from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-01"
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-31"
 *         description: Ngày kết thúc (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang (chỉ áp dụng khi không có technician_id)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số item per page (chỉ áp dụng khi không có technician_id)
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
 *                   oneOf:
 *                     - type: object
 *                       description: Khi có technician_id - chi tiết lịch của 1 technician
 *                       properties:
 *                         technician:
 *                           type: object
 *                         date_range:
 *                           type: object
 *                         schedules:
 *                           type: array
 *                         total_assignments:
 *                           type: number
 *                     - type: object
 *                       description: Khi không có technician_id - danh sách tất cả technician
 *                       properties:
 *                         technicians:
 *                           type: array
 *                         pagination:
 *                           type: object
 *       400:
 *         description: Bad request
 *       404:
 *         description: Technician not found
 */
router.get(
  "/technician-schedule",
  auth.authMiddleWare,
  appointment.getTechnicianSchedule
);


/**
 * @swagger
 * /api/appointment/assign-technician:
 *   put:
 *     summary: Gán technician cho appointment (Auto check conflict & tính end time)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointment_id
 *               - technician_id
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 example: "68e0f04908abb1b3a1334e52"
 *                 description: ID của appointment
 *               technician_id:
 *                 type: string
 *                 example: "68d4e34293dfe03972909142"
 *                 description: ID của technician
 *     responses:
 *       200:
 *         description: Assign thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     appointment:
 *                       type: object
 *                     estimated_completion:
 *                       type: string
 *                       example: "11:00"
 *                       description: Thời gian ước tính hoàn thành
 *       400:
 *         description: Technician đang bận (conflict về thời gian)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy appointment hoặc technician
 *       500:
 *         description: Lỗi server
 */
router.put(
  "/assign-technician",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  appointment.assignTechnician
);

/**
 * @swagger
 * /api/appointment/update-status:
 *   put:
 *     summary: Thay đổi trạng thái appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointment_id
 *               - status
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 example: "68e0f04908abb1b3a1334e52"
 *                 description: ID của appointment
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, in_progress, done, cancelled]
 *                 example: "in_progress"
 *                 description: Trạng thái mới
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy appointment
 *       500:
 *         description: Lỗi server
 */
router.put(
  "/update-status",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin", "technician"),
  appointment.updateAppointmentStatus
);

/**
 * @swagger
 * /api/appointment/myAppointment:
 *   get:
 *     summary: Lấy danh sách appointments của user hiện tại đang đăng nhập
 *     tags: [Appointments]
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
 *         description: Số item per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accept, deposited, completed, paid, canceled]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách appointments thành công
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi server
 */
router.get(
  "/myAppointment",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin", "technician"),
  appointment.getMyAppointments
);

/**
 * @swagger
 * /api/appointment/{appointmentId}:
 *   get:
 *     summary: Lấy thông tin appointment theo ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của appointment
 *     responses:
 *       200:
 *         description: Lấy thông tin appointment thành công
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy appointment
 *       500:
 *         description: Lỗi server
 */
router.get(
  "/:appointmentId",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  appointment.getAppointmentById
);

/**
 * @swagger
 * /api/appointment/{appointmentId}/final-payment:
 *   put:
 *     summary: Cập nhật appointment với final payment (số tiền còn lại)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của appointment
 *     responses:
 *       200:
 *         description: Cập nhật appointment với final payment thành công
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
 *       400:
 *         description: Appointment chưa hoàn thành hoặc đã có final payment
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy appointment
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/appointment/{appointmentId}:
 *   delete:
 *     summary: Xóa appointment (chỉ cho phép xóa appointment có trạng thái pending)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của appointment cần xóa
 *     responses:
 *       200:
 *         description: Xóa appointment thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Chỉ có thể xóa appointment có trạng thái pending
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy appointment
 *       500:
 *         description: Lỗi server
 */
router.put(
  "/:appointmentId/final-payment",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  appointment.createFinalPayment
);

router.delete(
  "/:appointmentId",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  appointment.deleteAppointment
);

module.exports = router;
