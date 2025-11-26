var express = require("express");
var router = express.Router();
const user = require("../controller/UserController");
const auth = require("../middlewares/auth");

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
 *     summary: Register new account
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
 *         description: Registration successful
 *       400:
 *         description: Validation error
 */
router.post("/register", user.registerUser);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login to get JWT token
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
 *         description: Login successful, returns accessToken
 *       401:
 *         description: Incorrect username or password
 */
router.post("/login", user.login);

/**
 * @swagger
 * /api/users/getprofile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *       401:
 *         description: Unauthorized / Token invalid
 *       404:
 *         description: Profile not found
 */
router.get(
  "/getprofile",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin", "technician"),
  user.getProfileUser
);

/**
 * @swagger
 * /api/users/getallprofile:
 *   get:
 *     summary: Get all users (can filter by role)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ staff, technician]
 *         description: Filter by role (default is customer if no parameter)
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Filter by specific user ID (optional)
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
 *     responses:
 *       200:
 *         description: Successfully retrieved list of users
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           role:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
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
 *       500:
 *         description: Server error
 */
router.get("/getallprofile", user.getAllProfileUsers);

/**
 * @swagger
 * /api/users/loginGoogle:
 *   post:
 *     summary: Login with Google
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
 *         description: Login successful
 *       401:
 *         description: Invalid Google token
 */
router.post("/loginfirebase", user.loginGoogle);

/**
 * @swagger
 * /api/users/forgotPassword:
 *   post:
 *     summary: Request password reset (send email with reset link)
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
 *         description: Password reset email sent
 *       400:
 *         description: Email does not exist
 */
router.post("/forgotPassword", user.forgotPassword);

/**
 * @swagger
 * /api/users/resetpassword:
 *   post:
 *     summary: Reset password
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
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post("/resetpassword", user.resetPassword);

/**
 * @swagger
 * /api/users/upload-avatar:
 *   post:
 *     summary: Upload avatar cho user hiện tại
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/upload-avatar",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin", "technician"),
  ...user.uploadAvatar
);

/**
 * @swagger
 * /api/users/update-profile:
 *   put:
 *     summary: Update profile information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               phoneNumber:
 *                 type: string
 *                 example: "0901234567"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put(
  "/update-profile",
  auth.authMiddleWare,
  auth.requireRole("customer", "staff", "admin", "technician"),
  user.updateProfile
);

module.exports = router;
