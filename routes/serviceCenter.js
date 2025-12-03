const serviceCenter = require("../controller/ServiceCenterController");
const serviceCenterHours = require("../controller/ServiceCenterHoursController");
var express = require("express");
var router = express.Router();
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Service Center
 *   description: API for managing service centers and work schedules
 */

/**
 * @swagger
 * /api/service-center/create:
 *   post:
 *     summary: Create new service center
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
 *               user_id:
 *                 type: string
 *                 description: Staff user id assigned to this center
 *               email:
 *                 type: string
 *                 example: "evcenter@gmail.com"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Service Center created successfully
 *       400:
 *         description: Invalid data
 *       500:
 *         description: Server error
 */
router.post(
  "/create",
  auth.authMiddleWare,
  auth.requireRole("admin", "staff"),
  serviceCenter.createServiceCenter
);
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
 *     summary: Get list of all service centers and working hours by week, date range or specific date
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Specific date (YYYY-MM-DD). Highest priority - only returns data for this date. If date is provided, start_date/end_date and weeks will be ignored
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *           default: 4
 *         description: Number of weeks to retrieve (default 4 weeks). Only used when date and start_date/end_date are not provided
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by service center ID. When provided, each service center response will include list of technicians
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD). Must be accompanied by end_date. Only used when date is not provided. If Sat/Sun, still displays but only those 2 days
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD). Must be accompanied by start_date. Only used when date is not provided. If Sat/Sun, still displays but only those 2 days
 *     responses:
 *       200:
 *         description: Successfully retrieved list of service centers and working hours by week
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
 *                   example: "Successfully retrieved list of service centers and working hours (4 weeks)"
 *                   description: Message depends on query parameter - "date YYYY-MM-DD" if date provided, "from YYYY-MM-DD to YYYY-MM-DD" if start_date/end_date provided, or "X weeks" if using weeks
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
 *                         description: List of weeks
 *                         items:
 *                           type: object
 *                           properties:
 *                             week_number:
 *                               type: number
 *                               example: 1
 *                               description: Week number (1, 2, 3, 4...)
 *                             week_start:
 *                               type: string
 *                               format: date
 *                               example: "2025-11-03"
 *                               description: Week start date (Monday)
 *                             week_end:
 *                               type: string
 *                               format: date
 *                               example: "2025-11-07"
 *                               description: Week end date (Friday)
 *                             days:
 *                               type: array
 *                               description: List of days in the week (Monday-Friday)
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
 *                                     description: Total slots for this day
 *                                   bookedSlots:
 *                                     type: number
 *                                     example: 4
 *                                     description: Number of slots booked on this day
 *                                   remainingSlots:
 *                                     type: number
 *                                     example: 12
 *                                     description: Remaining slots
 *                                   availableSlots:
 *                                     type: number
 *                                     example: 12
 *                                     description: Available slots (same as remainingSlots)
 *                                   timeSlots:
 *                                     type: array
 *                                     description: List of bookable time slots (only shows booked or available slots)
 *                                     items:
 *                                       type: object
 *                                       properties:
 *                                         time:
 *                                           type: string
 *                                           example: "09:00"
 *                                           description: Time slot (HH:mm)
 *                                         bookedCount:
 *                                           type: number
 *                                           example: 1
 *                                           description: Number of bookings at this time slot
 *                                         isFull:
 *                                           type: boolean
 *                                           example: true
 *                                           description: Whether time slot is full
 *                                         available:
 *                                           type: number
 *                                           example: 0
 *                                           description: Available slots at this time slot
 *                                         isBooked:
 *                                           type: boolean
 *                                           example: true
 *                                           description: Whether this time slot has bookings
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error when retrieving service center list
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
 *     summary: Update service center information
 *     tags: [Service Center]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: ID of service center to update
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
 *         description: Service center updated successfully
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
 *                   example: "Service center updated successfully"
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
 *         description: Cannot update due to existing appointments
 *       404:
 *         description: Service center not found
 *       500:
 *         description: Server error when updating service center
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
 *     summary: Delete service center
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
 *     summary: Add employee (technician) to service center
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
 *               center_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Technician added to service center successfully
 */
router.post(
  "/technican/add",
  auth.authMiddleWare,
  auth.requireRole("admin", "technician", "staff", "customer"),
  serviceCenter.addTechnicanToServiceCenter
);

/**
 * @swagger
 * /api/service-center/technican/remove:
 *   post:
 *     summary: Remove technician from service center
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
 *               center_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Technician removed successfully
 *       404:
 *         description: Technician not found in this center
 */
router.post(
  "/technican/remove",
  auth.authMiddleWare,
  auth.requireRole("admin", "technician", "staff"),
  serviceCenter.removeTechnicanFromCenter
);

// Lấy danh sách trung tâm gần nhất theo vị trí người dùng
router.get(
  "/near",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "technician", "admin"),
  serviceCenter.getNearestCenters
);
module.exports = router;
