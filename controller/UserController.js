// controller/UserController.js
var User = require("../model/user");
var bryctjs = require("bcryptjs");
var jwt = require("jsonwebtoken");
var admin = require("../firebase/firebase");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { cacheGet, cacheSet, cacheDel } = require("../services/redis");
const crypto = require("crypto");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

exports.registerUser = async (req, res) => {
  try {
    const { username, password, phoneNumber, email, fullName } = req.body;

    const checkuserName = await User.findOne({ username }).lean();
    if (checkuserName) {
      return res.status(400).json({
        message: "Please Create New UserName",
        success: false,
      });
    }
    const checkfullName = await User.findOne({ fullName }).lean();
    if (checkfullName) {
      return res.status(400).json({
        message: "Please Create New Full Name",
        success: false,
      });
    }

    const salt = await bryctjs.genSalt(10);
    const hashPassword = await bryctjs.hash(password, salt);

    const payload = {
      username,
      password: hashPassword,
      phoneNumber,
      email,
      fullName,
    };
    const newUser = await new User(payload).save();

    // BUST CACHE sau khi ghi
    await cacheDel("users:all");
    await cacheDel(`users:${newUser._id}`);

    return res.status(201).json({
      message: "User register successfully",
      error: false,
      success: true,
      data: {
        username: newUser.username,
        phonenumber: newUser.phoneNumber,
        email: newUser.email,
        fullname: newUser.fullName,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};

exports.login = async (req, res) => {
  const secretKey = process.env.SECRET_KEY;
  const refreshKey = process.env.REFRESH_KEY;
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found", error: false, success: false });
    }

    const checkPassword = await bryctjs.compare(password, user.password);
    if (!checkPassword) {
      return res
        .status(400)
        .json({ message: "Password Incorrect", error: false, success: false });
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      secretKey,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign({ userId: user._id }, refreshKey, {
      expiresIn: "1d",
    });

    // Trả về thêm 'role' trong response
    return res.status(201).json({
      status: true,
      accessToken,
      refreshToken,
      role: user.role, // Trả về 'role'
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message || error,
      error: true,
      success: false,
    });
  }
};


exports.getProfileUser = async (req, res) => {
  const userId = req._id?.toString();
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const key = `users:${userId}`;
  try {
    const cached = await cacheGet(key);
    if (cached) return res.status(200).json({ user: cached });

    const user = await User.findById(userId)
      .select("-password -verifyToken -verifyTokenExpires")
      .lean();
    if (!user) return res.status(404).json({ message: "Not found profile" });

    await cacheSet(key, user, 300);
    return res.status(201).json({ user });
  } catch (e) {
    return res.status(500).json({ message: "Server Error", error: e.message });
  }
};

exports.getAllProfileUsers = async (req, res) => {
  try {
    const { role, id, page = 1, limit = 10 } = req.query;

    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );
    const query = {};
    if (id) {
      query._id = id;
    } else {
      query.role = role || "customer";
    }
    const cacheKey = `users:all:${
      id ? `id:${id}` : `role:${role || "customer"}`
    }:${validatedPage}:${validatedLimit}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const total = await User.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const users = await User.find(query)
      .select(
        "-password -verifyToken -verifyTokenExpires -resetToken -resetTokenExpires"
      )
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      users,
      pagination,
      "Lấy danh sách users thành công"
    );

    await cacheSet(cacheKey, response, 120);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all profile users error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách users",
      error: error.message,
      success: false,
    });
  }
};

exports.loginGoogle = async (req, res) => {
  try {
    const secretKey = process.env.SECRET_KEY || process.env.JWT_SECRET;
    const { idToken } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;
    const fullName = decodedToken.name;

    let user = await User.findOne({ email });
    let isNew = false;
    if (!user) {
      user = await User.create({
        email,
        fullName,
        role: "customer",
        provider: "google",
      });
      isNew = true;
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      secretKey,
      { expiresIn: "1h" }
    );

    if (isNew) {
      await cacheDel("users:all");
      await cacheDel(`users:${user._id}`);
    }

    return res.status(201).json({
      success: true,
      user,
      accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message || error,
      success: false,
      error: true,
    });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email không tồn tại!" });

    const resetToken = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    user.resetToken = resetToken;
    user.resetTokenExpires = expires;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL || process.env.BASE_URL
      }/reset-password?token=${resetToken}`;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.MAIL_USERNAME,
      to: email,
      subject: "Reset Password",
      html: `<p>Click để đặt lại mật khẩu: <a href="${resetLink}">Reset Password</a></p>`,
    });

    return res
      .status(200)
      .json({ message: "Email reset password đã được gửi." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;
    const { newPassword } = req.body;

    if (!token || !newPassword)
      return res
        .status(400)
        .json({ message: "Thiếu token hoặc mật khẩu mới." });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }
    user.password = await bryctjs.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    return res.status(200).json({ message: "Đặt lại mật khẩu thành công." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
