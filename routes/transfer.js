// routes/transfer.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const {
    createTransferRequest,
    getReceivedTransferRequests,
    getSentTransferRequests,
    processTransferRequest,
    respondToCounterOffer,
    executeTransfer,
    cancelTransferRequest,
} = require("../controller/TransferController");

/**
 * @swagger
 * /api/transfer/request:
 *   post:
 *     summary: Gửi request chuyển phụ tùng từ trung tâm A sang trung tâm B
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to_center_id
 *               - items
 *             properties:
 *               from_center_id:
 *                 type: string
 *                 description: ID của trung tâm nguồn (optional, nếu không có sẽ tìm theo user_id)
 *               to_center_id:
 *                 type: string
 *                 description: ID của trung tâm đích
 *               items:
 *                 type: array
 *                 description: Danh sách phụ tùng cần chuyển
 *                 items:
 *                   type: object
 *                   required:
 *                     - part_id
 *                     - quantity
 *                   properties:
 *                     part_id:
 *                       type: string
 *                       description: ID của part
 *                       example: "69186ad4b089b15278b784ec"
 *                     quantity:
 *                       type: number
 *                       description: Số lượng cần
 *                       example: 10
 *                     supplier:
 *                       type: string
 *                       description: Tên hãng/supplier (optional)
 *                       example: "Hãng XYZ"
 *                 example:
 *                   - part_id: "69186ad4b089b15278b784ec"
 *                     quantity: 10
 *                     supplier: "Hãng XYZ"
 *     responses:
 *       201:
 *         description: Request created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post("/request", auth.authMiddleWare, createTransferRequest);

/**
 * @swagger
 * /api/transfer/received:
 *   get:
 *     summary: Xem danh sách request nhận được (trung tâm B)
 *     tags: [Transfer]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected, counter_offer, counter_accept, counter_rejected, completed, cancelled]
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID của service center (optional, nếu không có sẽ tìm theo user_id)
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/received", auth.authMiddleWare, getReceivedTransferRequests);

/**
 * @swagger
 * /api/transfer/sent:
 *   get:
 *     summary: Xem danh sách request đã gửi (trung tâm A)
 *     tags: [Transfer]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected, counter_offer, counter_accept, counter_rejected, completed, cancelled]
 *       - in: query
 *         name: center_id
 *         schema:
 *           type: string
 *         description: ID của service center (optional, nếu không có sẽ tìm theo user_id)
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/sent", auth.authMiddleWare, getSentTransferRequests);

/**
 * @swagger
 * /api/transfer/{transferId}/process:
 *   put:
 *     summary: "Xử lý request (trung tâm B: chấp nhận/từ chối/đề xuất thay thế)"
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject, counter_offer]
 *                 example: "counter_offer"
 *               counter_offer_items:
 *                 type: array
 *                 description: Bắt buộc khi action là counter_offer
 *                 items:
 *                   type: object
 *                   required:
 *                     - part_id
 *                     - quantity
 *                     - available_quantity
 *                   properties:
 *                     part_id:
 *                       type: string
 *                       description: ID của part
 *                       example: "69186ad4b089b15278b784ec"
 *                     quantity:
 *                       type: number
 *                       description: Số lượng muốn đề xuất
 *                       example: 40
 *                     available_quantity:
 *                       type: number
 *                       description: Số lượng có sẵn trong kho
 *                       example: 41
 *                     supplier:
 *                       type: string
 *                       description: Tên hãng/supplier (optional)
 *                       example: "Hãng ABC"
 *                 example:
 *                   - part_id: "69186ad4b089b15278b784ec"
 *                     quantity: 40
 *                     available_quantity: 41
 *                     supplier: "Hãng ABC"
 *               notes:
 *                 type: string
 *                 description: Ghi chú (optional)
 *                 example: "Giờ chỉ có 41 cái thôi m lấy k"
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put("/:transferId/process", auth.authMiddleWare, processTransferRequest);

/**
 * @swagger
 * /api/transfer/{transferId}/respond:
 *   put:
 *     summary: Chấp thuận/hủy response từ trung tâm B (trung tâm A xử lý counter_offer)
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put("/:transferId/respond", auth.authMiddleWare, respondToCounterOffer);

/**
 * @swagger
 * /api/transfer/{transferId}/execute:
 *   post:
 *     summary: Thực hiện chuyển kho (cập nhật inventory của cả 2 trung tâm)
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transfer executed successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post("/:transferId/execute", auth.authMiddleWare, executeTransfer);

/**
 * @swagger
 * /api/transfer/{transferId}/cancel:
 *   put:
 *     summary: Hủy request (trung tâm A có thể hủy request đã gửi)
 *     tags: [Transfer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request cancelled successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put("/:transferId/cancel", auth.authMiddleWare, cancelTransferRequest);

module.exports = router;

