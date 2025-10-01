var express = require('express');
var router = express.Router();
const user = require('../controller/UserController');
const auth = require('../middlewares/auth');


/**
 * @swagger
 * tags:
 *   name: Users
 *   description:  
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 example: customer1
 *               password:
 *                 type: string
 *                 example: 123456
 *               phoneNumber:
 *                 type: string
 *                 example: 0907057587
 *               email:
 *                 type: string
 *                 example: huynhtrantam13@gmail.com
 *               fullName:
 *                 type: string
 *                 example: Huỳnh Trấn Tâm
 *     responses:
 *       200:
 *         description: Đăng ký thành công
 *       400:
 *         description: Lỗi validate
 */
router.post('/register', user.registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Đăng nhập để lấy JWT token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: customer1
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về accessToken 
 *       401:
 *         description: Sai username hoặc password
 */
router.post('/login', user.login);

/**
 * @swagger
 * /api/users/getprofile:
 *   get:
 *     summary: Lấy profile của user hiện tại
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy profile thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *       401:
 *         description: Unauthorized / Token invalid
 *       404:
 *         description: Profile không tìm thấy
 */
router.get('/getprofile', auth.authMiddleWare,
    auth.requireRole('customer', 'staff', 'admin'),
    user.getProfileUser
);

/**
 * @swagger
 * /api/users/getallprofile:
 *   get:
 *     summary: Lấy tất cả user (chỉ admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách users thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                 count:
 *                   type: integer
 *                   example: 10
 *       401:
 *         description: Unauthorized / Token invalid
 *       403:
 *         description: Forbidden (không phải admin)
 */
router.get('/getallprofile', auth.authMiddleWare,
    auth.requireRole('admin',),
    user.getAllProfileUsers
);

/**
 * @swagger
 * /api/users/loginGoogle:
 *   post:
 *     summary: Đăng nhập bằng Google
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
 *     responses:
 *       201:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Token Google không hợp lệ
 */
router.post("/loginfirebase", user.loginGoogle);

/**
 * @swagger
 * /api/users/forgotPassword:
 *   post:
 *     summary: Yêu cầu reset mật khẩu (gửi email có link reset)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "customer@gmail.com"
 *     responses:
 *       200:
 *         description: Email reset password đã được gửi
 *       400:
 *         description: Email không tồn tại
 */
router.post("/forgotPassword", user.forgotPassword);

/**
 * @swagger
 * /api/users/resetpassword:
 *   post:
 *     summary: Đặt lại mật khẩu mới
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token reset password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *       400:
 *         description: Token không hợp lệ hoặc hết hạn
 */
router.post("/resetpassword", user.resetPassword);


module.exports = router;
