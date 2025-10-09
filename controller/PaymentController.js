const { PayOS } = require("@payos/node");
const User = require("../model/user");
const Payment = require("../model/payment");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

exports.createPaymentLink = async (req, res) => {
  try {
    const { amount, description } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Số tiền không hợp lệ",
        success: false,
      });
    }

    if (!description) {
      return res.status(400).json({
        message: "Mô tả thanh toán là bắt buộc",
        success: false,
      });
    }

    if (description.length > 25) {
      return res.status(400).json({
        message: "Mô tả thanh toán tối đa 25 ký tự",
        success: false,
      });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin user",
        success: false,
      });
    }

    const order_code = parseInt(
      Date.now().toString() + Math.floor(Math.random() * 1000)
    );

    const paymentDataForPayOS = {
      orderCode: order_code,
      amount: amount,
      description: description,
      items: [
        {
          name: description,
          quantity: 1,
          price: amount,
        },
      ],
      returnUrl: `${process.env.BASE_URL}/api/payment/success?order_code=${order_code}`,
      cancelUrl: `${process.env.BASE_URL}/api/payment/cancel?order_code=${order_code}`,
    };

    const paymentLinkResponse = await payOS.paymentRequests.create(
      paymentDataForPayOS
    );

    const paymentData = {
      order_code: order_code,
      amount: amount,
      description: description,
      user_id: user._id,
      status: "pending",
      checkout_url: paymentLinkResponse.checkoutUrl,
      qr_code: paymentLinkResponse.qrCode,
      expired_at: new Date(Date.now() + 15 * 60 * 1000),
    };

    const payment = await new Payment(paymentData).save();

    return res.status(201).json({
      message: "Tạo link thanh toán thành công",
      success: true,
      data: {
        payment_id: payment._id,
        order_code: order_code,
        amount: amount,
        description: description,
        checkout_url: paymentLinkResponse.checkoutUrl,
        qr_code: paymentLinkResponse.qrCode,
        customer_info: {
          user_id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Create payment link error:", error);
    return res.status(500).json({
      message: "Lỗi tạo link thanh toán",
      error: error.message,
      success: false,
    });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { order_code, status } = req.body;

    if (!order_code || !status) {
      return res.status(400).json({
        message: "Thiếu order_code hoặc status",
        success: false,
      });
    }

    const validStatuses = ["pending", "paid", "cancelled", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Status không hợp lệ. Chỉ chấp nhận: pending, paid, cancelled, failed",
        success: false,
      });
    }

    const payment = await Payment.findOne({ order_code: parseInt(order_code) });

    if (!payment) {
      return res.status(404).json({
        message: "Không tìm thấy thanh toán",
        success: false,
      });
    }

    payment.status = status;
    if (status === "paid") {
      payment.paid_at = new Date();
    }
    await payment.save();

    console.log(` Cập nhật trạng thái thanh toán: ${order_code} -> ${status}`);

    return res.status(200).json({
      message: "Cập nhật trạng thái thanh toán thành công",
      success: true,
      data: {
        payment_id: payment._id,
        order_code: order_code,
        status: status,
        updated_at: new Date(),
      },
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    return res.status(500).json({
      message: "Lỗi cập nhật trạng thái thanh toán",
      error: error.message,
      success: false,
    });
  }
};

exports.getPaymentTransaction = async (req, res) => {
  try {
    const { order_code } = req.params;

    if (!order_code) {
      return res.status(400).json({
        message: "Thiếu order_code",
        success: false,
      });
    }

    const payment = await Payment.findOne({ order_code: parseInt(order_code) })
      .populate("user_id", "username fullName email phone address role")
      .lean();

    if (!payment) {
      return res.status(404).json({
        message: "Không tìm thấy thanh toán",
        success: false,
      });
    }

    const transactionInfo = await payOS.paymentRequests.get(
      parseInt(order_code)
    );

    return res.status(200).json({
      message: "Lấy thông tin transaction thành công",
      success: true,
      data: {
        _id: payment._id,
        order_code: payment.order_code,
        amount: payment.amount,
        description: payment.description,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        customer_info: {
          user_id: payment.user_id._id,
          username: payment.user_id.username,
          fullName: payment.user_id.fullName,
          email: payment.user_id.email,
          role: payment.user_id.role,
        },
      },
    });
  } catch (error) {
    console.error("Get payment transaction error:", error);
    return res.status(500).json({
      message: "Lỗi lấy thông tin transaction",
      error: error.message,
      success: false,
    });
  }
};

exports.paymentSuccess = async (req, res) => {
  try {
    const { order_code } = req.query;

    if (!order_code) {
      return res.status(400).json({
        message: "Thiếu order_code",
        success: false,
      });
    }

    console.log(` Thanh toán thành công: ${order_code}`);

    const frontendUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/payment/success?order_code=${order_code}`;

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Payment success error:", error);
    return res.status(500).json({
      message: "Lỗi xử lý thanh toán thành công",
      error: error.message,
      success: false,
    });
  }
};

exports.paymentCancel = async (req, res) => {
  try {
    const { order_code } = req.query;

    if (!order_code) {
      return res.status(400).json({
        message: "Thiếu order_code",
        success: false,
      });
    }

    console.log(` Thanh toán bị hủy: ${order_code}`);

    const frontendUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/payment/cancel?order_code=${order_code}`;

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Payment cancel error:", error);
    return res.status(500).json({
      message: "Lỗi xử lý hủy thanh toán",
      error: error.message,
      success: false,
    });
  }
};

exports.getPaymentList = async (req, res) => {
  try {
    const userId = req._id?.toString();
    const { page = 1, limit = 10, status, user_id } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );

    const query = {};
    if (status) {
      query.status = status;
    }
    if (user_id) {
      query.user_id = user_id;
    }

    const total = await Payment.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const payments = await Payment.find(query)
      .populate("user_id", "username fullName email phone address role")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      payments,
      pagination,
      "Lấy danh sách thanh toán thành công"
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get payment list error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách thanh toán",
      error: error.message,
      success: false,
    });
  }
};

// Lấy transactions của user hiện tại đang đăng nhập
exports.getMyTransactions = async (req, res) => {
  try {
    const userId = req._id?.toString();
    const { page = 1, limit = 10, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );

    const query = { user_id: userId };
    if (status) {
      query.status = status;
    }

    const total = await Payment.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const transactions = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      transactions,
      pagination,
      "Lấy danh sách transactions của tôi thành công"
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get my transactions error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách transactions",
      error: error.message,
      success: false,
    });
  }
};
