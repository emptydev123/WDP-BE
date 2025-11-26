var vehicle = require("../controller/Vehiclecontroller");
var express = require("express");
var router = express.Router();
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: API for managing vehicles and electric vehicle models
 */

/**
 * @swagger
 * /api/vehicle/createModel:
 *   post:
 *     summary: Create new electric vehicle model
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand
 *               - model_name
 *               - year
 *               - battery_type
 *             properties:
 *               brand:
 *                 type: string
 *                 example: "VinFast"
 *               model_name:
 *                 type: string
 *                 example: "VF 9"
 *               year:
 *                 type: number
 *                 example: 2025
 *               battery_type:
 *                 type: string
 *                 example: "Lithium-ion"
 *               maintenanceIntervalKm:
 *                 type: number
 *                 example: 10000
 *               maintenanceIntervaMonths:
 *                 type: number
 *                 example: 6
 *     responses:
 *       201:
 *         description: Vehicle model created successfully
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
router.post(
  "/createModel",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin", "staff"),
  vehicle.createVehicleModel
);

/**
 * @swagger
 * /api/vehicle/get:
 *   get:
 *     summary: Get list of all vehicle models
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved list of vehicle models
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
router.get("/get", auth.authMiddleWare, vehicle.getVehicleModels);

/**
 * @swagger
 * /api/vehicle/createVehicle:
 *   post:
 *     summary: Create new vehicle for user
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - license_plate
 *               - model_id
 *             properties:
 *               license_plate:
 *                 type: string
 *                 example: "79A1-56789"
 *               color:
 *                 type: string
 *                 example: "Xanh dương"
 *               purchase_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-01"
 *               current_miliage:
 *                 type: number
 *                 example: 15000
 *               battery_health:
 *                 type: number
 *                 example: 98
 *               last_service_mileage:
 *                 type: number
 *                 example: 10000
 *               model_id:
 *                 type: string
 *                 example: "671f0dca3b0c4b8f12f1a911"
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
router.post(
  "/createVehicle",
  auth.authMiddleWare,
  auth.requireRole("customer"),
  vehicle.createVehicle
);

/**
 * @swagger
 * /api/vehicle/getVehicleUser:
 *   get:
 *     summary: Get list of vehicles for current user
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved list of vehicles
 *       404:
 *         description: User has no vehicles
 *       500:
 *         description: Server error
 */
router.get(
  "/getVehicleUser",
  auth.authMiddleWare,
  auth.requireRole("customer"),
  vehicle.getUserVehicle
);

/**
 * @swagger
 * /api/vehicle/getAllVehicleUser:
 *   get:
 *     summary: Get list of all vehicles for all users
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved list of all vehicles
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
router.get(
  "/getAllVehicleUser",
  auth.authMiddleWare,
  auth.requireRole("admin", "staff"),
  vehicle.getAllVehicle
);

/**
 * @swagger
 * /api/vehicle/update/{id}:
 *   put:
 *     summary: Update user vehicle information
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of vehicle to update
 *         schema:
 *           type: string
 *           example: "671f0dca3b0c4b8f12f1a911"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               color:
 *                 type: string
 *                 example: "Đỏ"
 *               current_miliage:
 *                 type: number
 *                 example: 18000
 *               battery_health:
 *                 type: number
 *                 example: 95
 *               last_service_mileage:
 *                 type: number
 *                 example: 15000
 *               purchase_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-10-01"
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       400:
 *         description: Vehicle has active appointments, cannot update
 *       404:
 *         description: Vehicle does not exist or does not belong to this user
 *       500:
 *         description: Server error
 */
router.put(
  "/update/:id",
  auth.authMiddleWare,
  auth.requireRole("admin", "staff", "customer"),
  vehicle.updateVehicle
);

/**
 * @swagger
 * /api/vehicle/delete/{id}:
 *   delete:
 *     summary: Delete user vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID của xe cần xóa
 *         schema:
 *           type: string
 *           example: "671f0dca3b0c4b8f12f1a911"
 *     responses:
 *       200:
 *         description: Xóa xe thành công
 *       400:
 *         description: Xe đang có lịch hẹn hoạt động, không thể xóa
 *       404:
 *         description: Xe không tồn tại hoặc không thuộc về user này
 *       500:
 *         description: Lỗi server
 */
router.delete(
  "/delete/:id",
  auth.authMiddleWare,
  auth.requireRole("admin", "customer", "staff"),
  vehicle.deleteVehicle
);
module.exports = router;
