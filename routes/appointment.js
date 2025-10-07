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
 *           enum: [pending, accept, completed, canceled]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: service_center_id
 *         schema:
 *           type: string
 *         description: Lọc theo service center
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
  auth.requireRole("staff", "admin"),
  appointment.getAppointments
);

/**
 * @swagger
 * /api/appointment/assign-technician:
 *   post:
 *     summary: Nhận lịch (assign technician)
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
 *               - time_start
 *               - time_end
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 example: "68e0f04908abb1b3a1334e52"
 *                 description: ID của appointment
 *               technician_id:
 *                 type: string
 *                 example: "68d4e34293dfe03972909142"
 *                 description: ID của technician
 *               time_start:
 *                 type: string
 *                 example: "09:00"
 *                 description: Thời gian bắt đầu làm việc
 *               time_end:
 *                 type: string
 *                 example: "17:00"
 *                 description: Thời gian kết thúc làm việc
 *     responses:
 *       200:
 *         description: Nhận lịch thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy appointment hoặc technician
 *       500:
 *         description: Lỗi server
 */
router.post(
  "/assign-technician",
  auth.authMiddleWare,
  auth.requireRole("staff", "admin"),
  appointment.assignTechnician
);

/**
 * @swagger
 * /api/appointment/update-status:
 *   post:
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
router.post(
  "/update-status",
  auth.authMiddleWare,
  auth.requireRole("staff", "admin"),
  appointment.updateAppointmentStatus
);

/**
 * @swagger
 * /api/appointment/update-service-record:
 *   post:
 *     summary: Quản lý phiếu tiếp nhận dịch vụ + checklist EV
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
 *               - service_record
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 example: "68e0f04908abb1b3a1334e52"
 *                 description: ID của appointment
 *               service_record:
 *                 type: object
 *                 properties:
 *                   pre_service_check:
 *                     type: object
 *                     properties:
 *                       battery_level:
 *                         type: string
 *                       tire_condition:
 *                         type: string
 *                       brake_system:
 *                         type: string
 *                       charging_port:
 *                         type: string
 *                   service_performed:
 *                     type: array
 *                     items:
 *                       type: string
 *                   parts_replaced:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         part_name:
 *                           type: string
 *                         part_number:
 *                           type: string
 *                         quantity:
 *                           type: number
 *                   post_service_check:
 *                     type: object
 *                     properties:
 *                       test_drive:
 *                         type: boolean
 *                       charging_test:
 *                         type: boolean
 *                       system_check:
 *                         type: boolean
 *                   technician_notes:
 *                     type: string
 *                   customer_signature:
 *                     type: string
 *     responses:
 *       200:
 *         description: Cập nhật phiếu tiếp nhận dịch vụ thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy appointment
 *       500:
 *         description: Lỗi server
 */
router.post(
  "/update-service-record",
  auth.authMiddleWare,
  auth.requireRole("staff", "admin"),
  appointment.updateServiceRecord
);

/**
 * @swagger
 * /api/appointment/user/{username}:
 *   get:
 *     summary: Lấy danh sách appointment theo username
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username của khách hàng
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
 *           enum: [pending, accept, completed, canceled]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách appointment theo username thành công
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
 *                           service_type_id:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                               description:
 *                                 type: string
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
 *       404:
 *         description: Không tìm thấy user
 *       500:
 *         description: Lỗi server
 */
router.get(
  "/user/:username",
  auth.authMiddleWare,
  auth.requireRole("staff", "admin"),
  appointment.getAppointmentsByUsername
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
  auth.requireRole("staff", "admin"),
  appointment.getAppointmentById
);

module.exports = router;
