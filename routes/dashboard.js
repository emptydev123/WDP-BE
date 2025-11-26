// routes/dashboard.js
const express = require("express");
const router = express.Router();
const DashboardController = require("../controller/DashboardController");
const { authMiddleWare } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics API
 */

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Dashboard overview (all metrics)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by Service Center ID
 *     responses:
 *       200:
 *         description: Dashboard overview with all metrics
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/overview",
  authMiddleWare,
  DashboardController.getDashboardOverview
);

/**
 * @swagger
 * /api/dashboard/top-brands:
 *   get:
 *     summary: List of most repaired vehicle brands (sorted from highest to lowest)
 *     description: |
 *       - No parameters: Get all vehicle brands sorted from highest to lowest
 *       - With filter: Filter and sort from highest to lowest
 *       - If vehicle_id provided: Filter by which vehicle comes for repair most (by vehicle_id)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD). If not provided, get all
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD). If not provided, get all
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by Service Center ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *         description: Filter by appointment status. If not provided, get all
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *         description: Filter by vehicle_id to see which vehicle comes for repair most
 *     responses:
 *       200:
 *         description: List of most repaired vehicle brands or vehicles (sorted from highest to lowest)
 */
router.get(
  "/top-brands",
  authMiddleWare,
  DashboardController.getTopBrandsByRepairs
);

/**
 * @swagger
 * /api/dashboard/top-parts:
 *   get:
 *     summary: List of most replaced parts (sorted from highest to lowest)
 *     description: |
 *       - No parameters: Get all parts sorted from highest to lowest
 *       - With filter: Filter and sort from highest to lowest
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD). If not provided, get all
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD). If not provided, get all
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by Service Center ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, completed, canceled]
 *         description: Filter by checklist status. If not provided, get all
 *     responses:
 *       200:
 *         description: List of most replaced parts (sorted from highest to lowest)
 */
router.get(
  "/top-parts",
  authMiddleWare,
  DashboardController.getTopPartsReplaced
);

/**
 * @swagger
 * /api/dashboard/top-technicians-appointments:
 *   get:
 *     summary: List of employees with most appointments (sorted from highest to lowest)
 *     description: |
 *       - No parameters: Get all employees sorted from highest to lowest
 *       - With filter: Filter and sort from highest to lowest
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD). If not provided, get all
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD). If not provided, get all
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by Service Center ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *         description: Filter by appointment status. If not provided, get all
 *     responses:
 *       200:
 *         description: List of employees with most appointments (sorted from highest to lowest)
 */
router.get(
  "/top-technicians-appointments",
  authMiddleWare,
  DashboardController.getTopTechniciansByAppointments
);

/**
 * @swagger
 * /api/dashboard/top-technicians-revenue:
 *   get:
 *     summary: List of employees earning most revenue (sorted from highest to lowest)
 *     description: |
 *       - No parameters: Get all employees sorted from highest to lowest
 *       - With filter: Filter and sort from highest to lowest
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD). If not provided, get all
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD). If not provided, get all
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by Service Center ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, assigned, check_in, in_progress, completed, canceled]
 *         description: Filter by appointment status. If not provided, get all
 *     responses:
 *       200:
 *         description: List of employees earning most revenue (sorted from highest to lowest)
 */
router.get(
  "/top-technicians-revenue",
  authMiddleWare,
  DashboardController.getTopTechniciansByRevenue
);

module.exports = router;
