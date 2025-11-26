const service = require("../controller/ServiceController");
var express = require("express");
var router = express.Router();
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: API for managing electric vehicle maintenance services
 */

/**
 * @swagger
 * /api/service/create:
 *   post:
 *     summary: Create new service
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
 *                 example: "Electric vehicle battery replacement"
 *               description:
 *                 type: string
 *                 example: "High-capacity electric vehicle battery replacement service"
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
 *         description: Service created successfully
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
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
 *     summary: Get list of active services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Successfully retrieved list of services
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
router.get(
  "/get",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin", "techical"),
  service.getService
);
/**
 * @swagger
 * /api/service/update/{id}:
 *   put:
 *     summary: Update service information
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the service to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_name:
 *                 type: string
 *                 example: "Premium car wash"
 *               description:
 *                 type: string
 *                 example: "Steam car wash and interior care"
 *               base_price:
 *                 type: number
 *                 example: 300000
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               estimated_duration:
 *                 type: string
 *                 example: "1.5"
 *     responses:
 *       200:
 *         description: Update successful
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */

router.put(
  "/update/:id",
  auth.authMiddleWare,
  auth.requireRole("admin", "technical", "staff"),
  service.updateService
);
/**
 * @swagger
 * /api/service/delete/{id}:
 *   delete:
 *     summary: Delete service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the service to delete
 *     responses:
 *       200:
 *         description: Delete successful
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/delete/:id",
  auth.authMiddleWare,
  auth.requireRole("admin", "technical", "staff", "customer"),
  service.deleteService
);

module.exports = router;
