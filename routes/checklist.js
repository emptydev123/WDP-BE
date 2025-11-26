// routes/checklist.js
const express = require("express");
const router = express.Router();
const ChecklistController = require("../controller/ChecklistController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Checklist
 *   description: API for managing checklists
 */

/**
 * @swagger
 * /api/checklist:
 *   get:
 *     summary: Get list of checklists
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: appointment_id
 *         schema:
 *           type: string
 *         description: Filter by appointment ID
 *       - in: query
 *         name: technicianId
 *         schema:
 *           type: string
 *         description: Filter by technician ID (filter checklists of this technician through appointment)
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (YYYY-MM-DD)
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
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           total_cost:
 *                             type: number
 *                             description: Total cost (sum of sellPrice * quantity of all parts)
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleWare, ChecklistController.getAllChecklists);

/**
 * @swagger
 * /api/checklist/checkin:
 *   post:
 *     summary: Create checkin - record initial vehicle condition (Technician)
 *     description: |
 *       When customer brings the vehicle, technician creates checkin first to record the initial condition of the vehicle.
 *       After successful checkin creation, appointment status will be updated to "check_in".
 *       Then proceed to create checklist.
 *     tags: [Checklist]
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
 *               - initial_vehicle_condition
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 description: Appointment ID (must have status "assigned" and not yet checked-in)
 *               initial_vehicle_condition:
 *                 type: string
 *                 description: Initial vehicle condition when checking in (before inspection)
 *                 example: "Vehicle has minor scratches on front door, wheels are good, headlights working normally"
 *     responses:
 *       201:
 *         description: Checkin created successfully, appointment status updated to "check_in"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Checkin created successfully"
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     appointment:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "check_in"
 *                         initial_vehicle_condition:
 *                           type: string
 *                         checkin_datetime:
 *                           type: string
 *                           format: date-time
 *                         checkin_by:
 *                           type: object
 *                           description: Information of technician who checked in
 *       400:
 *         description: Bad request - Appointment status không phải "assigned" hoặc đã được check-in
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment không tồn tại
 */
router.post("/checkin", authMiddleWare, ChecklistController.createCheckin);

/**
 * @swagger
 * /api/checklist:
 *   post:
 *     summary: Create new checklist (Technician)
 *     description: |
 *       Create checklist after checkin.
 *       Appointment must have status "check_in" before creating checklist.
 *     tags: [Checklist]
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
 *               - issue_type_id
 *               - issue_description
 *               - solution_applied
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 description: Appointment ID (must have status "check_in" and already checked-in)
 *               issue_type_id:
 *                 type: string
 *                 description: Issue type ID
 *               issue_description:
 *                 type: string
 *                 description: Detailed issue description
 *               solution_applied:
 *                 type: string
 *                 description: Solution applied
 *               parts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - part_id
 *                     - quantity
 *                   properties:
 *                     part_id:
 *                       type: string
 *                       description: Part ID
 *                     quantity:
 *                       type: number
 *                       description: Quantity
 *                       minimum: 1
 *                 description: List of parts to use (optional)
 *     responses:
 *       201:
 *         description: Checklist created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Checklist created successfully"
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Checklist created with status "pending"
 *       400:
 *         description: Bad request - Appointment has not been checked-in or already has checklist
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment, IssueType, or Part not found
 */
router.post("/", authMiddleWare, ChecklistController.createChecklist);

/**
 * @swagger
 * /api/checklist/{checklistId}/accept:
 *   put:
 *     summary: Staff accept checklist and quote price
 *     description: |
 *       When staff accepts checklist successfully:
 *       - If there are parts: Calculate final_cost, checklist status = "accepted", appointment status remains "check_in" (waiting for payment)
 *       - If no parts: Checklist status = "accepted", appointment status changes to "in_progress" immediately
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of checklist to accept
 *     responses:
 *       200:
 *         description: Checklist accepted, price quoted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Checklist has been accepted, price quoted or Checklist has been accepted, changed to in_progress (no parts)"
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     checklist:
 *                       type: object
 *                       description: Accepted checklist
 *                     totalCost:
 *                       type: number
 *                       description: Total cost (0 if no parts)
 *                     appointment:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "in_progress"
 *                           description: "in_progress if no parts, check_in if has parts (waiting for payment)"
 *                         final_cost:
 *                           type: number
 *       400:
 *         description: Bad request - Checklist has been processed or insufficient inventory
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Staff role required
 *       404:
 *         description: Checklist or appointment not found
 */
router.put(
  "/:checklistId/accept",
  authMiddleWare,
  ChecklistController.acceptChecklist
);

/**
 * @swagger
 * /api/checklist/{checklistId}/cancel:
 *   put:
 *     summary: Staff cancel checklist with note
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of checklist to cancel
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 description: Reason for canceling checklist (optional)
 *                 example: "Parts no longer in stock"
 *     responses:
 *       200:
 *         description: Checklist canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Checklist has been canceled"
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "canceled"
 *                     cancellation_note:
 *                       type: string
 *                       description: Cancellation reason (if any)
 *       400:
 *         description: Checklist cannot be canceled (can only cancel checklists with status pending or accepted)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied. Staff role required
 *       404:
 *         description: Checklist not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:checklistId/cancel",
  authMiddleWare,
  ChecklistController.cancelChecklist
);

/**
 * @swagger
 * /api/checklist/{checklistId}/complete:
 *   put:
 *     summary: Technician complete checklist
 *     tags: [Checklist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checklist completed
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Checklist not found
 */
router.put(
  "/:checklistId/complete",
  authMiddleWare,
  ChecklistController.completeChecklist
);

module.exports = router;
