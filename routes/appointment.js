var express = require("express");
var router = express.Router();
const appointment = require("../controller/AppointmentController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: API for managing appointments (Staff side)
 */

/**
 * @swagger
 * /api/appointment/list:
 *   get:
 *     summary: View list of appointments from customers
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *         description: Filter by status
 *       - in: query
 *         name: service_center_id
 *         schema:
 *           type: string
 *         description: Filter by service center
 *       - in: query
 *         name: technician_id
 *         schema:
 *           type: string
 *         description: Filter by technician ID
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: is_working_now
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter technicians currently working (real-time)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-15"
 *         description: Filter by specific date (YYYY-MM-DD)
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-01"
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-31"
 *         description: Filter to date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Successfully retrieved list of appointments
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
 *         description: Server error
 */
router.get(
  "/list",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "technician", "admin"),
  appointment.getAppointments
);

/**
 * @swagger
 * /api/appointment/create:
 *   post:
 *     summary: Create new appointment with automatic technician assignment
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
 *                 description: Appointment date (required)
 *               appoinment_time:
 *                 type: string
 *                 example: "09:00"
 *                 description: Appointment time (required)
 *               notes:
 *                 type: string
 *                 example: "Regular maintenance for VinFast electric vehicle"
 *                 description: Additional notes (optional)
 *               user_id:
 *                 type: string
 *                 example: "66e4e34293dfe03972909142"
 *                 description: User ID (required)
 *               vehicle_id:
 *                 type: string
 *                 example: "66e0f04908abb1b3a1334e53"
 *                 description: Vehicle ID for maintenance (required)
 *               center_id:
 *                 type: string
 *                 example: "66e0f04908abb1b3a1334e54"
 *                 description: Service center ID (required)
 *               service_type_id:
 *                 type: string
 *                 example: "66e0f04908abb1b3a1334e56"
 *                 description: Service type ID (required)
 *               technician_id:
 *                 type: string
 *                 example: "670a5c290fa49362a0536e27"
 *                 description: |
 *                   Selected technician ID (optional):
 *                   - If empty or not sent: System will automatically assign a suitable technician
 *                   - Automatically selects technician with available slots, not busy at that time, and prioritizes those with fewest appointments
 *                   - Each technician maximum 4 slots/day
 *     responses:
 *       201:
 *         description: Appointment created successfully (deposit payment of 2000 VND created and technician automatically assigned if needed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Appointment created successfully. System has automatically assigned technician."
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Full appointment information after creation
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
 *                     deposit_cost:
 *                       type: number
 *                     final_cost:
 *                       type: number
 *                     user_id:
 *                       type: object
 *                       description: Customer information
 *                     vehicle_id:
 *                       type: object
 *                       description: Vehicle information
 *                     center_id:
 *                       type: object
 *                       description: Service center information
 *                     service_type_id:
 *                       type: object
 *                       description: Service type information
 *                     technician_id:
 *                       type: object
 *                       description: Assigned or automatically assigned technician
 *                     assigned:
 *                       type: object
 *                       description: Assigned technician (same as technician_id)
 *                     payment_id:
 *                       type: object
 *                       description: Deposit payment information
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: |
 *           Validation error:
 *           - Missing required information
 *           - Scheduling rule violation (duplicate appointment, time overlap)
 *           - Technician already has 4 slots/day or is busy
 *           - No available technician found (when technician not selected)
 *           - No available slots for this date
 *       401:
 *         description: Unauthorized access
 *       404:
 *         description: User, vehicle, service center or service type not found
 *       500:
 *         description: Server error when creating appointment
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
 *     summary: View technician(s) work schedule
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: technician_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Technician ID (if not provided, get all technicians)
 *       - in: query
 *         name: center_id
 *         required: false
 *         schema:
 *           type: string
 *         description: Service Center ID to filter appointments by center (optional, if not provided, get appointments from all centers)
 *       - in: query
 *         name: date_from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-01"
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2024-01-31"
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (only applies when technician_id is not provided)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (only applies when technician_id is not provided)
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
 *                       description: When technician_id is provided - detailed schedule of 1 technician
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
 *                       description: When technician_id is not provided - list of all technicians
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
  auth.requireRole("customer", "staff", "admin", "technician"),
  appointment.getTechnicianSchedule
);

/**
 * @swagger
 * /api/appointment/update-status:
 *   put:
 *     summary: Change appointment status
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
 *                 description: Appointment ID
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *                 example: "in_progress"
 *                 description: New status
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
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
 *     summary: Get list of appointments for currently logged in user
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Successfully retrieved list of appointments
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
 *         description: Server error
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
 *     summary: Get appointment information by ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Successfully retrieved appointment information
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
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
 *     summary: Create final payment for quoted appointment
 *     description: |
 *       Create final payment for appointment that has been checked-in and quoted (checklist has been accepted).
 *       When payment is successful, the system will automatically:
 *       1. Update inventory (deduct parts quantity)
 *       2. Change appointment status to "in_progress"
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID (must have status "check_in" and already have final_cost)
 *     responses:
 *       200:
 *         description: Final payment created successfully
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
 *         description: Appointment has not been checked-in, not quoted, or already has final payment
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/appointment/{appointmentId}:
 *   delete:
 *     summary: Delete appointment (only allows deletion of appointments with pending status)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of appointment to delete
 *     responses:
 *       200:
 *         description: Appointment deleted successfully
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
 *         description: Can only delete appointments with pending status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Server error
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
