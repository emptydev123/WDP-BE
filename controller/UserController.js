// controller/UserController.js
var User = require("../model/user");
var bryctjs = require("bcryptjs");
var jwt = require("jsonwebtoken");
var admin = require("../firebase/firebase");

// THÊM IMPORT REDIS
const { cacheGet, cacheSet, cacheDel } = require("../services/redis");

exports.registerUser = async (req, res) => {
  try {
    const { username, password, phoneNumber, email, fullName } = req.body;

    const checkuserName = await User.findOne({ username }).lean();
    if (checkuserName) {
      return res.status(400).json({ message: "Please Create New UserName" });
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
  const secretKey = process.env.SECRET_KEY || process.env.JWT_SECRET;
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
        .json({ message: "Password Incorect", error: false, success: false });
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      secretKey,
      { expiresIn: "1h" }
    );
    return res.status(200).json({ status: true, accessToken });
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
    return res.status(200).json({ user });
  } catch (e) {
    return res.status(500).json({ message: "Server Error", error: e.message });
  }
};

exports.getAllProfileUsers = async (req, res) => {
  const key = "users:all";
  try {
    const cached = await cacheGet(key);
    if (cached) return res.status(200).json(cached);

    const users = await User.find()
      .select("-password -verifyToken -verifyTokenExpires")
      .lean();
    const payload = { users, count: users.length };

    await cacheSet(key, payload, 120);
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(500).json({ message: "Server Error", error: e.message });
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

    // Nếu là user mới, bust cache
    if (isNew) {
      await cacheDel("users:all");
      await cacheDel(`users:${user._id}`);
    }

    return res.json({
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
