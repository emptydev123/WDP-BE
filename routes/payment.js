var express = require("express");
var router = express.Router();
const payment = require("../controller/PaymentController");
const auth = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: API quản lý thanh toán PayOS
 */

/**
 * @swagger
 * /api/payment/create:
 *   post:
 *     summary: Tạo link thanh toán PayOS
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
 *                 description: Số tiền thanh toán (VND)
 *               description:
 *                 type: string
 *                 example: "Bảo dưỡng xe điện"
 *                 description: Mô tả thanh toán (tối đa 25 ký tự)
 *               timeoutSeconds:
 *                 type: number
 *                 example: 900
 *                 description: Thời gian timeout tính bằng giây (tùy chọn, mặc định 900 giây = 15 phút). Frontend truyền xuống để set timeout cho payment.
 *     responses:
 *       201:
 *         description: Tạo link thanh toán thành công
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
 *     summary: Cập nhật trạng thái thanh toán
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
 *                 description: Mã đơn hàng
 *               status:
 *                 type: string
 *                 enum: [pending, paid, cancelled, failed]
 *                 example: "paid"
 *                 description: Trạng thái thanh toán
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi server
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
 *     summary: Lấy thông tin transaction thanh toán
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã đơn hàng
 *     responses:
 *       200:
 *         description: Lấy thông tin transaction thành công
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
 *         description: Thiếu order_code
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy thanh toán
 *       500:
 *         description: Lỗi server
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
 *     summary: Lấy danh sách thanh toán (mock data)
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
 *           enum: [pending, paid, cancelled, failed]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: Lọc theo user ID
 *     responses:
 *       200:
 *         description: Lấy danh sách thanh toán thành công
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi server
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
 *     summary: Lấy danh sách transactions của user hiện tại đang đăng nhập
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
 *         description: Thời gian timeout tính bằng giây (tùy chọn, mặc định 900 giây = 15 phút). Frontend truyền xuống để set timeout cho payment retry.
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
