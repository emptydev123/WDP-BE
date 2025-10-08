// routes/inventory.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  updateMinimumStock,
  getLowStockInventory,
  getPartDemandSuggestion,
  restockInventory,
  getInventoryByPartAndCenter,
} = require("../controller/InventoryController");

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Lấy danh sách inventory
 *     tags: [Inventory]
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
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by service center
 *       - in: query
 *         name: part_name
 *         schema:
 *           type: string
 *         description: Filter by part name
 *       - in: query
 *         name: low_stock
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter low stock items
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
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", auth.authMiddleWare, getAllInventory);

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     summary: Lấy danh sách inventory tồn kho thấp
 *     tags: [Inventory]
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
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by service center
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
 *                     pagination:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.get("/low-stock", auth.authMiddleWare, getLowStockInventory);

/**
 * @swagger
 * /api/inventory/demand-suggestion:
 *   get:
 *     summary: Gợi ý nhu cầu phụ tùng
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by service center
 *       - in: query
 *         name: days_ahead
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Số ngày dự báo
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
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           part_id:
 *                             type: object
 *                           center_id:
 *                             type: object
 *                           quantity_avaiable:
 *                             type: number
 *                           minimum_stock:
 *                             type: number
 *                           suggested_quantity:
 *                             type: number
 *                           urgency_level:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           reason:
 *                             type: string
 *                     total_suggestions:
 *                       type: number
 *                     days_ahead:
 *                       type: number
 *                     generated_at:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Server error
 */
router.get("/demand-suggestion", auth.authMiddleWare, getPartDemandSuggestion);

/**
 * @swagger
 * /api/inventory/part/{part_id}/center/{center_id}:
 *   get:
 *     summary: Lấy inventory theo part_id và center_id
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: part_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Part ID
 *       - in: path
 *         name: center_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Center ID
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
 *       400:
 *         description: Thiếu part_id hoặc center_id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy part, center hoặc inventory
 *       500:
 *         description: Server error
 */
router.get(
  "/part/:part_id/center/:center_id",
  auth.authMiddleWare,
  getInventoryByPartAndCenter
);

/**
 * @swagger
 * /api/inventory/{inventoryId}:
 *   get:
 *     summary: Lấy chi tiết inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inventoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID
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
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
router.get("/:inventoryId", auth.authMiddleWare, getInventoryById);

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Tạo inventory mới
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity_avaiable
 *               - center_id
 *               - part_id
 *             properties:
 *               quantity_avaiable:
 *                 type: number
 *                 description: Số lượng tồn kho
 *               minimum_stock:
 *                 type: number
 *                 description: Số lượng tồn kho tối thiểu
 *               cost_per_unit:
 *                 type: number
 *                 description: Giá mỗi đơn vị
 *               center_id:
 *                 type: string
 *                 description: Service center ID
 *               part_id:
 *                 type: string
 *                 description: Part ID
 *     responses:
 *       201:
 *         description: Inventory created successfully
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
 *         description: Bad request
 *       404:
 *         description: Part or service center not found
 *       500:
 *         description: Server error
 */
router.post("/", auth.authMiddleWare, createInventory);

/**
 * @swagger
 * /api/inventory/{inventoryId}:
 *   put:
 *     summary: Cập nhật inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inventoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity_avaiable:
 *                 type: number
 *                 description: Số lượng tồn kho
 *               minimum_stock:
 *                 type: number
 *                 description: Số lượng tồn kho tối thiểu
 *               cost_per_unit:
 *                 type: number
 *                 description: Giá mỗi đơn vị
 *               last_restocked:
 *                 type: string
 *                 format: date
 *                 description: Ngày nhập kho
 *     responses:
 *       200:
 *         description: Inventory updated successfully
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
 *         description: Bad request
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
router.put("/:inventoryId", auth.authMiddleWare, updateInventory);

/**
 * @swagger
 * /api/inventory/{inventoryId}:
 *   delete:
 *     summary: Xóa inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inventoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID
 *     responses:
 *       200:
 *         description: Inventory deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
router.delete("/:inventoryId", auth.authMiddleWare, deleteInventory);

/**
 * @swagger
 * /api/inventory/{inventoryId}/minimum-stock:
 *   put:
 *     summary: Cập nhật lượng tồn tối thiểu
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inventoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - minimum_stock
 *             properties:
 *               minimum_stock:
 *                 type: number
 *                 description: Số lượng tồn kho tối thiểu
 *     responses:
 *       200:
 *         description: Minimum stock updated successfully
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
 *         description: Bad request
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:inventoryId/minimum-stock",
  auth.authMiddleWare,
  updateMinimumStock
);

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     summary: Lấy danh sách inventory tồn kho thấp
 *     tags: [Inventory]
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
 *         name: center_id
 *         schema:
 *           type: string
 *         description: Filter by service center
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
 *                     pagination:
 *                       type: object
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/inventory/{inventoryId}/minimum-stock:
 *   put:
 *     summary: Cập nhật lượng tồn tối thiểu
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inventoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - minimum_stock
 *             properties:
 *               minimum_stock:
 *                 type: number
 *                 description: Số lượng tồn kho tối thiểu
 *     responses:
 *       200:
 *         description: Minimum stock updated successfully
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
 *         description: Bad request
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:inventoryId/minimum-stock",
  auth.authMiddleWare,
  updateMinimumStock
);

/**
 * @swagger
 * /api/inventory/{inventoryId}/restock:
 *   put:
 *     summary: Cập nhật tồn kho (restock)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inventoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Inventory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity_added
 *             properties:
 *               quantity_added:
 *                 type: number
 *                 description: Số lượng thêm vào
 *               cost_per_unit:
 *                 type: number
 *                 description: Giá mỗi đơn vị mới
 *     responses:
 *       200:
 *         description: Inventory restocked successfully
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
 *         description: Bad request
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
router.put("/:inventoryId/restock", auth.authMiddleWare, restockInventory);

module.exports = router;
