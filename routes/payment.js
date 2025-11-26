var express = require("express");
var router = express.Router();
const payment = require("../controller/PaymentController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: API for managing PayOS payments
 */

/**
 * @swagger
 * /api/payment/create:
 *   post:
 *     summary: Create PayOS payment link
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 500000
 *                 description: Payment amount (VND)
 *               description:
 *                 type: string
 *                 example: "Electric vehicle maintenance"
 *                 description: Payment description (max 25 characters)
 *               timeoutSeconds:
 *                 type: number
 *                 example: 900
 *                 description: Timeout duration in seconds (optional, default 900 seconds = 15 minutes). Frontend passes this to set payment timeout.
 *     responses:
 *       201:
 *         description: Payment link created successfully
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
 *                     order_code:
 *                       type: number
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *                     checkout_url:
 *                       type: string
 *                     qr_code:
 *                       type: string
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi server
 */
router.post(
  "/create",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  payment.createPaymentLink
);

/**
 * @swagger
 * /api/payment/update-status:
 *   put:
 *     summary: Update payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_code
 *               - status
 *             properties:
 *               order_code:
 *                 type: number
 *                 example: 1703123456789
 *                 description: Order code
 *               status:
 *                 type: string
 *                 enum: [pending, paid, cancelled, failed]
 *                 example: "paid"
 *                 description: Payment status
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put(
  "/update-status",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  payment.updatePaymentStatus
);

/**
 * @swagger
 * /api/payment/transaction/{order_code}:
 *   get:
 *     summary: Get payment transaction information
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Order code
 *     responses:
 *       200:
 *         description: Successfully retrieved transaction information
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
 *                     _id:
 *                       type: string
 *                     order_code:
 *                       type: number
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     customer_info:
 *                       type: object
 *                       properties:
 *                         user_id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         fullName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *       400:
 *         description: Missing order_code
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.get(
  "/transaction/:order_code",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  payment.getPaymentTransaction
);

/**
 * @swagger
 * /api/payment/list:
 *   get:
 *     summary: Get list of payments (mock data)
 *     tags: [Payments]
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
 *           enum: [pending, paid, cancelled, failed]
 *         description: Filter by status
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Successfully retrieved list of payments
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/list",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  payment.getPaymentList
);

/**
 * @swagger
 * /api/payment/myTransactions:
 *   get:
 *     summary: Get list of transactions for currently logged in user
 *     tags: [Payments]
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
 *           enum: [pending, paid, cancelled]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách transactions thành công
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
  "/myTransactions",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin", "technician"),
  payment.getMyTransactions
);

/**
 * @swagger
 * /api/payment/webhook/payos:
 *   post:
 *     summary: PayOS webhook endpoint
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data
 */
router.post("/webhook/payos", payment.handlePayOSWebhook);

/**
 * @swagger
 * /api/payment/success:
 *   get:
 *     summary: PayOS success redirect handler
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Order code from PayOS
 *     responses:
 *       302:
 *         description: Redirect to frontend success page
 *       400:
 *         description: Missing orderCode
 */
router.get("/success", payment.paymentSuccess);

/**
 * @swagger
 * /api/payment/cancel:
 *   get:
 *     summary: PayOS cancel redirect handler
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Order code from PayOS
 *     responses:
 *       302:
 *         description: Redirect to frontend cancel page
 *       400:
 *         description: Missing orderCode
 */
router.get("/cancel", payment.paymentCancel);

/**
 * @swagger
 * /api/payment/retry/{id}:
 *   get:
 *     summary: Retry failed payment by payment ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID to retry
 *       - in: query
 *         name: timeoutSeconds
 *         schema:
 *           type: number
 *           example: 900
 *         description: Timeout duration in seconds (optional, default 900 seconds = 15 minutes). Frontend passes this to set payment retry timeout.
 *     responses:
 *       201:
 *         description: Retry payment created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 */
router.get(
  "/retry/:id",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  payment.retryPayment
);

/**
 * @swagger
 * /api/payment/cancel/{orderCode}:
 *   post:
 *     summary: Cancel payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Order code to cancel
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 *       400:
 *         description: Cannot cancel payment
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 */
router.post(
  "/cancel/:orderCode",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin"),
  payment.cancelPayment
);

/**
 * @swagger
 * /api/payment/timeout-check:
 *   get:
 *     summary: Check for timeout payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timeout check completed
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/timeout-check",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin", "technician"),
  payment.timeoutCheck
);

module.exports = router;
