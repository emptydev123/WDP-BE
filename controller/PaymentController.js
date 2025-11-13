const { PayOS } = require("@payos/node");
const User = require("../model/user");
const Payment = require("../model/payment");
const Appointment = require("../model/appointment");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");
const { calculateTimeoutAt } = require("../utils/timeUtils");
const { PAYMENT_EXPIRED_TIME } = require("../utils/constants");

const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

// ========== UTILITY FUNCTIONS ==========
function extractOrderCode(body) {
  return (
    body?.data?.orderCode || body?.orderCode || body?.order?.orderCode || null
  );
}

function deriveStatus(body) {
  const rawStatus =
    body?.data?.status ||
    body?.status ||
    body?.transactionStatus ||
    body?.code ||
    "UNKNOWN";

  const s = String(rawStatus).toUpperCase();
  if (["PAID", "SUCCESS", "SUCCEEDED", "SUCCESSFUL", "00"].includes(s))
    return "PAID";
  if (["CANCELED", "CANCELLED"].includes(s)) return "CANCELLED";
  if (["FAILED", "FAIL", "01"].includes(s)) return "FAILED";
  if (["REFUNDED", "REFUND"].includes(s)) return "REFUNDED";
  return "UNKNOWN";
}

function isTimeout(payment) {
  return payment.timeoutAt && payment.timeoutAt < new Date();
}

function canRetryPayment(payment) {
  console.log("Checking canRetry for payment:", {
    status: payment.status,
  });

  const canRetry = [
    "CANCELLED",
    "EXPIRED",
    "TIMEOUT",
    "FAILED",
    "PENDING",
  ].includes(payment.status);

  console.log("Can retry result:", canRetry);
  return canRetry;
}

exports.createPaymentLink = async (req, res) => {
  try {
    const { amount, description, customer, timeoutSeconds } = req.body;
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

    // Validate và tính toán timeoutAt từ timeoutSeconds
    let timeoutAt;
    if (timeoutSeconds !== undefined && timeoutSeconds !== null) {
      const timeoutValue =
        typeof timeoutSeconds === "string"
          ? parseInt(timeoutSeconds, 10)
          : timeoutSeconds;
      if (isNaN(timeoutValue) || timeoutValue <= 0) {
        return res.status(400).json({
          message: "timeoutSeconds phải là số dương (tính bằng giây)",
          success: false,
        });
      }
      timeoutAt = calculateTimeoutAt(timeoutValue);
    } else {
      // Nếu không có timeoutSeconds, dùng default 15 phút
      timeoutAt = calculateTimeoutAt(PAYMENT_EXPIRED_TIME);
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin user",
        success: false,
      });
    }

    const orderCode = Date.now();
    const BASE = process.env.BASE_URL || "http://localhost:3000";
    const returnUrl = `${BASE}/api/payment/success?orderCode=${orderCode}`;
    const cancelUrl = `${BASE}/api/payment/cancel?orderCode=${orderCode}`;

    const paymentDataForPayOS = {
      orderCode: orderCode,
      amount: amount,
      description: description,
      items: [
        {
          name: description,
          quantity: 1,
          price: amount,
        },
      ],
      returnUrl: returnUrl,
      cancelUrl: cancelUrl,
    };

    const response = await payOS.paymentRequests.create(paymentDataForPayOS);

    // Debug: Log PayOS response to see QR code format
    console.log("🔍 [PaymentController] PayOS response:", {
      checkoutUrl: response.checkoutUrl,
      qrCode: response.qrCode,
      qrCodeType: typeof response.qrCode,
      qrCodeLength: response.qrCode?.length,
      qrCodePreview: response.qrCode?.substring(0, 100),
    });

    const paymentData = {
      orderCode: orderCode,
      amount: amount,
      description: description,
      user_id: userId, // Sử dụng userId string thay vì user._id ObjectId
      status: "PENDING",
      checkoutUrl: response.checkoutUrl,
      qrCode: response.qrCode,
      timeoutAt: timeoutAt,
      customer: customer || {
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        address: user.address,
      },
    };

    const payment = await new Payment(paymentData).save();

    console.log("createPaymentLink - payment saved:", {
      _id: payment._id,
      orderCode: payment.orderCode,
      user_id: payment.user_id,
      amount: payment.amount,
    });

    return res.status(201).json({
      message: "Tạo link thanh toán thành công",
      success: true,
      data: {
        payment_id: payment._id,
        orderCode: orderCode,
        amount: amount,
        description: description,
        checkoutUrl: response.checkoutUrl || payment.checkoutUrl,
        qrCode: response.qrCode || payment.qrCode || "",
        timeoutAt: payment.timeoutAt,
        canRetry: payment.canRetry,
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
    console.log(
      "updatePaymentStatus called - Method:",
      req.method,
      "Body:",
      req.body
    );
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

    // Tìm payment với cả orderCode và order_code để tương thích
    const payment = await Payment.findOne({
      $or: [
        { orderCode: parseInt(order_code) },
        { order_code: parseInt(order_code) },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        message: "Không tìm thấy thanh toán",
        success: false,
      });
    }

    // Đảm bảo orderCode được set (nếu payment chỉ có order_code)
    if (!payment.orderCode && payment.order_code) {
      payment.orderCode = payment.order_code;
    }
    if (!payment.orderCode) {
      payment.orderCode = parseInt(order_code);
    }

    // Chuyển đổi status thành chữ hoa để khớp với model enum
    const normalizedStatus = status.toUpperCase();
    payment.status = normalizedStatus;
    if (normalizedStatus === "PAID") {
      payment.paidAt = new Date();
    }
    await payment.save();

    // Khi payment status = "PAID", cập nhật status appointment
    if (normalizedStatus === "PAID") {
      // Cập nhật appointment với deposit payment (payment_id)
      await Appointment.updateMany(
        {
          payment_id: payment._id,
          status: "pending", // Chỉ cập nhật appointment đang pending
        },
        {
          status: "assigned", // Cập nhật status thành assigned khi đã thanh toán deposit
        }
      );

      // Cập nhật appointment với final payment (final_payment_id)
      await Appointment.updateMany(
        {
          final_payment_id: payment._id,
          status: "repaired", // Chỉ cập nhật appointment đã repaired
        },
        {
          status: "completed", // Cập nhật status thành completed khi đã thanh toán final payment
        }
      );

      // Emit socket events to affected customers and technicians
      try {
        const io = req.app.get("io");
        if (io) {
          const affected = await Appointment.find({
            $or: [
              { payment_id: payment._id },
              { final_payment_id: payment._id },
            ],
          })
            .select("_id status user_id technician_id")
            .populate("user_id", "_id")
            .populate("technician_id", "_id")
            .lean();

          affected.forEach((appt) => {
            const room = appt?.user_id?._id?.toString();
            if (room) {
              io.to(room).emit("appointment_updated", {
                appointment_id: appt._id,
                status: appt.status,
              });
            }
            const techRoom = appt?.technician_id?._id?.toString();
            if (techRoom) {
              io.to(techRoom).emit("appointment_updated", {
                appointment_id: appt._id,
                status: appt.status,
              });
            }
          });
        }
      } catch (e) {
        console.error("Socket emit error (updatePaymentStatus):", e?.message || e);
      }
    }

    console.log(
      ` Cập nhật trạng thái thanh toán: ${order_code} -> ${normalizedStatus}`
    );

    return res.status(200).json({
      message: "Cập nhật trạng thái thanh toán thành công",
      success: true,
      data: {
        payment_id: payment._id,
        order_code: order_code,
        status: normalizedStatus,
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

    console.log("getPaymentTransaction - order_code:", order_code);

    if (!order_code) {
      return res.status(400).json({
        message: "Thiếu order_code",
        success: false,
      });
    }

    // Thử query với cả orderCode và order_code để tương thích
    const payment = await Payment.findOne({
      $or: [
        { orderCode: parseInt(order_code) },
        { order_code: parseInt(order_code) },
      ],
    })
      .populate("user_id", "username fullName email phone address role")
      .lean();

    console.log(
      "getPaymentTransaction - payment found:",
      payment ? "YES" : "NO"
    );

    if (!payment) {
      return res.status(404).json({
        message: "Không tìm thấy thanh toán",
        success: false,
      });
    }

    // Fallback: query PayOS and synchronize status to DB if webhook missed
    try {
      const transactionInfo = await payOS.paymentRequests.get(
        parseInt(order_code)
      );
      const derived = deriveStatus(transactionInfo);
      console.log("getPaymentTransaction - PayOS info:", {
        status: derived,
      });
      if (derived && derived !== payment.status) {
        // Update DB to reflect latest PayOS status
        const update = { status: derived, updatedAt: new Date() };
        if (derived === "PAID") update.paidAt = new Date();
        await Payment.updateOne(
          { _id: payment._id },
          { $set: update }
        );

        // Also update related appointment statuses when paid
        if (derived === "PAID") {
          await Appointment.updateMany(
            { payment_id: payment._id, status: "pending" },
            { status: "assigned" }
          );
          await Appointment.updateMany(
            { final_payment_id: payment._id, status: "repaired" },
            { status: "completed" }
          );

          // Emit socket events to affected customers and technicians
          try {
            const io = req.app.get("io");
            if (io) {
              const affected = await Appointment.find({
                $or: [
                  { payment_id: payment._id },
                  { final_payment_id: payment._id },
                ],
              })
                .select("_id status user_id technician_id")
                .populate("user_id", "_id")
                .populate("technician_id", "_id")
                .lean();

              affected.forEach((appt) => {
                const room = appt?.user_id?._id?.toString();
                if (room) {
                  io.to(room).emit("appointment_updated", {
                    appointment_id: appt._id,
                    status: appt.status,
                  });
                }
                const techRoom = appt?.technician_id?._id?.toString();
                if (techRoom) {
                  io.to(techRoom).emit("appointment_updated", {
                    appointment_id: appt._id,
                    status: appt.status,
                  });
                }
              });
            }
          } catch (e) {
            console.error("Socket emit error (getPaymentTransaction):", e?.message || e);
          }
        }

        // Reflect updated status in memory object for response
        payment.status = derived;
        if (derived === "PAID") payment.paidAt = new Date();
      }
    } catch (payosError) {
      console.log("getPaymentTransaction - PayOS error:", payosError.message);
    }

    return res.status(200).json({
      message: "Lấy thông tin transaction thành công",
      success: true,
      data: {
        _id: payment._id,
        orderCode: payment.orderCode || payment.order_code,
        amount: payment.amount,
        description: payment.description,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        customer_info: payment.user_id
          ? {
              user_id: payment.user_id._id,
              username: payment.user_id.username,
              fullName: payment.user_id.fullName,
              email: payment.user_id.email,
              role: payment.user_id.role,
            }
          : null,
        timeoutAt: payment.timeoutAt,
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

    console.log("getMyTransactions - userId:", userId);
    console.log("getMyTransactions - req._id:", req._id);

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

    console.log("getMyTransactions - query:", query);

    const total = await Payment.countDocuments(query);
    console.log("getMyTransactions - total:", total);

    const pagination = createPagination(validatedPage, validatedLimit, total);

    const transactions = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    console.log("getMyTransactions - transactions count:", transactions.length);

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

// ========== WEBHOOK HANDLING ==========
exports.handlePayOSWebhook = async (req, res) => {
  try {
    console.log("Body:", JSON.stringify(req.body, null, 2));

    // Kiểm tra nếu body rỗng hoặc không có dữ liệu
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log("Empty webhook body received");
      return res.json({
        error: 0,
        message: "Empty webhook body",
        data: null,
      });
    }

    // Sử dụng PayOS verifyPaymentWebhookData nếu có, nếu không thì dùng req.body
    let webhookData;
    try {
      webhookData = payOS.verifyPaymentWebhookData(req.body);
      console.log("Verified webhook data:", webhookData);
    } catch (verifyError) {
      console.log(
        "PayOS verification failed, using raw body:",
        verifyError.message
      );
      webhookData = req.body;
    }

    if (
      ["Ma giao dich thu nghiem", "VQRIO123"].includes(webhookData.description)
    ) {
      console.log("Sandbox transaction ignored");
      return res.json({
        error: 0,
        message: "Ok (sandbox ignored)",
        data: webhookData,
      });
    }

    const orderCode =
      extractOrderCode(webhookData) || extractOrderCode(req.body);
    const status = deriveStatus(webhookData);

    console.log("Extracted orderCode:", orderCode);
    console.log("Derived status:", status);

    if (!orderCode) {
      console.warn(
        "[Webhook] Missing orderCode. Body:",
        JSON.stringify(req.body)
      );
    } else {
      // Kiểm tra payment hiện tại
      const existingPayment = await Payment.findOne({
        orderCode: Number(orderCode),
      });

      // Nếu đã PAID và webhook lại đến, không cần xử lý lại (idempotency)
      if (
        existingPayment &&
        existingPayment.status === "PAID" &&
        status === "PAID"
      ) {
        console.log(
          `[Webhook] Payment ${orderCode} đã PAID trước đó, bỏ qua duplicate webhook`
        );
        return res.json({
          error: 0,
          message: "Ok (duplicate webhook ignored)",
          data: { orderCode, status: "PAID", duplicate: true },
        });
      }

      const updatedPayment = await Payment.findOneAndUpdate(
        { orderCode: Number(orderCode) },
        {
          status,
          lastWebhook: webhookData,
          paidAt: status === "PAID" ? new Date() : undefined,
        },
        { new: true }
      );

      console.log("Updated payment:", updatedPayment ? "SUCCESS" : "NOT FOUND");

      // Chỉ cập nhật appointment khi status = PAID và payment đã được update
      if (status === "PAID" && updatedPayment) {
        // Đảm bảo không cập nhật nhiều lần (idempotency)
        // Cập nhật appointment với deposit payment (payment_id)
        await Appointment.updateMany(
          {
            payment_id: updatedPayment._id,
            status: "pending", // Chỉ cập nhật appointment đang pending
          },
          {
            status: "assigned", // Cập nhật status thành assigned khi đã thanh toán deposit
          }
        );

        // Cập nhật appointment với final payment (final_payment_id)
        await Appointment.updateMany(
          {
            final_payment_id: updatedPayment._id,
            status: "repaired", // Chỉ cập nhật appointment đã repaired
          },
          {
            status: "completed", // Cập nhật status thành completed khi đã thanh toán final payment
          }
        );

        // Emit socket events to affected customers and technicians
        try {
          const io = req.app.get("io");
          if (io) {
            const affected = await Appointment.find({
              $or: [
                { payment_id: updatedPayment._id },
                { final_payment_id: updatedPayment._id },
              ],
            })
              .select("_id status user_id technician_id")
              .populate("user_id", "_id")
              .populate("technician_id", "_id")
              .lean();

            affected.forEach((appt) => {
              const room = appt?.user_id?._id?.toString();
              if (room) {
                io.to(room).emit("appointment_updated", {
                  appointment_id: appt._id,
                  status: appt.status,
                });
              }
              const techRoom = appt?.technician_id?._id?.toString();
              if (techRoom) {
                io.to(techRoom).emit("appointment_updated", {
                  appointment_id: appt._id,
                  status: appt.status,
                });
              }
            });
          }
        } catch (e) {
          console.error("Socket emit error (handlePayOSWebhook):", e?.message || e);
        }
      }
    }

    return res.json({ error: 0, message: "Ok", data: { orderCode, status } });
  } catch (error) {
    console.error("[Webhook] error:", error);

    // Trả về success ngay cả khi có lỗi để PayOS không retry
    return res.json({
      error: 0,
      message: "Webhook processed",
      data: { error: error.message },
    });
  }
};

exports.retryPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeoutSeconds } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "Missing payment ID parameter",
        success: false,
      });
    }

    const oldDoc = await Payment.findOne({
      _id: id,
      user_id: userId,
    });

    if (!oldDoc) {
      return res.status(404).json({
        message: "Payment not found",
        success: false,
      });
    }

    if (oldDoc.status === "PAID") {
      return res.status(400).json({
        message: "Order already PAID",
        success: false,
      });
    }

    if (!canRetryPayment(oldDoc)) {
      return res.status(400).json({
        message: "Cannot retry this payment",
        success: false,
        data: {
          reason: "Payment cannot be retried",
          status: oldDoc.status,
        },
      });
    }

    // Validate và tính toán timeoutAt từ timeoutSeconds
    let timeoutAt;
    if (timeoutSeconds !== undefined && timeoutSeconds !== null) {
      const timeoutValue =
        typeof timeoutSeconds === "string"
          ? parseInt(timeoutSeconds, 10)
          : timeoutSeconds;
      if (isNaN(timeoutValue) || timeoutValue <= 0) {
        return res.status(400).json({
          message: "timeoutSeconds phải là số dương (tính bằng giây)",
          success: false,
        });
      }
      timeoutAt = calculateTimeoutAt(timeoutValue);
    } else {
      // Nếu không có timeoutSeconds, dùng default 15 phút
      timeoutAt = calculateTimeoutAt(PAYMENT_EXPIRED_TIME);
    }

    const newOrderCode = Date.now();
    const BASE = process.env.BASE_URL || "http://localhost:3000";
    const returnUrl = `${BASE}/api/payment/success?orderCode=${newOrderCode}`;
    const cancelUrl = `${BASE}/api/payment/cancel?orderCode=${newOrderCode}`;

    const payload = {
      orderCode: newOrderCode,
      amount: oldDoc.amount,
      description: oldDoc.description,
      items: [
        {
          name: oldDoc.description,
          quantity: 1,
          price: oldDoc.amount,
        },
      ],
      returnUrl,
      cancelUrl,
    };

    const response = await payOS.paymentRequests.create(payload);

    const newPaymentData = {
      orderCode: newOrderCode,
      amount: oldDoc.amount,
      description: oldDoc.description,
      user_id: userId,
      status: "PENDING",
      checkoutUrl: response.checkoutUrl,
      qrCode: response.qrCode,
      timeoutAt: timeoutAt,
      retryOf: oldDoc.orderCode,
      customer: oldDoc.customer,
    };

    console.log("Creating retry payment:", {
      oldOrderCode: oldDoc.orderCode,
      newOrderCode,
      oldPaymentId: oldDoc._id,
    });

    const newPayment = await Payment.create(newPaymentData);

    // Cập nhật appointment để trỏ đến payment mới
    const Appointment = require("../model/appointment");
    const updatedAppointment = await Appointment.findOneAndUpdate(
      {
        payment_id: oldDoc._id,
      },
      {
        $set: {
          payment_id: newPayment._id,
        },
      },
      { new: true }
    );

    console.log(
      "Updated appointment:",
      updatedAppointment ? "SUCCESS" : "NOT FOUND"
    );
    if (updatedAppointment) {
      console.log("Appointment now points to new payment:", newOrderCode);
    }

    await Payment.updateOne(
      { _id: oldDoc._id },
      { $set: { replacedBy: newOrderCode } }
    );

    return res.status(201).json({
      message: "Retry payment created successfully",
      success: true,
      data: {
        newOrderCode,
        oldOrderCode: oldDoc.orderCode,
        checkoutUrl: response.checkoutUrl,
        qrCode: response.qrCode,
        appointmentUpdated: !!updatedAppointment,
        appointmentId: updatedAppointment?._id,
      },
    });
  } catch (error) {
    console.error("Retry payment error:", error);
    return res.status(500).json({
      message: "Lỗi retry payment",
      error: error.message,
      success: false,
    });
  }
};

// ========== CANCEL PAYMENT ==========
exports.cancelPayment = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!orderCode) {
      return res.status(400).json({
        message: "Missing orderCode parameter",
        success: false,
      });
    }

    const payment = await Payment.findOne({
      orderCode: Number(orderCode),
      user_id: userId,
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
        success: false,
      });
    }

    if (payment.status === "PAID") {
      return res.status(400).json({
        message: "Cannot cancel paid payment",
        success: false,
      });
    }

    const updatedPayment = await Payment.findOneAndUpdate(
      { orderCode: Number(orderCode) },
      {
        status: "CANCELLED",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );

    console.log(`[Cancel] Payment ${orderCode} cancelled successfully`);

    return res.status(200).json({
      message: "Payment cancelled successfully",
      success: true,
      data: {
        orderCode: updatedPayment.orderCode,
        status: updatedPayment.status,
        cancelledAt: updatedPayment.cancelledAt,
        canRetry: canRetryPayment(updatedPayment),
      },
    });
  } catch (error) {
    console.error("[Cancel] Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

// ========== TIMEOUT CHECK ==========
exports.timeoutCheck = async (req, res) => {
  try {
    const now = new Date();

    const timeoutPayments = await Payment.find({
      status: "PENDING",
      timeoutAt: { $lt: now },
    });

    console.log(
      `[Timeout Check] Found ${timeoutPayments.length} timeout payments`
    );

    const updatePromises = timeoutPayments.map((payment) =>
      Payment.findOneAndUpdate(
        { orderCode: payment.orderCode },
        {
          status: "TIMEOUT",
          updatedAt: new Date(),
        },
        { new: true }
      )
    );

    const updatedPayments = await Promise.all(updatePromises);

    return res.status(200).json({
      message: "Timeout check completed",
      success: true,
      data: {
        timeoutCount: timeoutPayments.length,
        updatedPayments: updatedPayments.map((p) => ({
          orderCode: p.orderCode,
          status: p.status,
          canRetry: canRetryPayment(p),
        })),
      },
    });
  } catch (error) {
    console.error("[Timeout Check] Error:", error);
    return res.status(500).json({
      message: "Timeout check failed",
      error: error.message,
      success: false,
    });
  }
};

// ========== PAYMENT REDIRECT HANDLERS ==========
exports.paymentSuccess = async (req, res) => {
  try {
    const { orderCode } = req.query;

    console.log(`Payment success redirect: ${orderCode}`);

    if (!orderCode) {
      return res.status(400).json({
        message: "Thiếu orderCode",
        success: false,
      });
    }

    // Redirect về frontend với thông tin thành công
    const frontendUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/payment/success?orderCode=${orderCode}`;

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Payment success redirect error:", error);
    return res.status(500).json({
      message: "Lỗi xử lý redirect thành công",
      error: error.message,
      success: false,
    });
  }
};

exports.paymentCancel = async (req, res) => {
  try {
    const { orderCode } = req.query;

    console.log(`Payment cancel redirect: ${orderCode}`);

    if (!orderCode) {
      return res.status(400).json({
        message: "Thiếu orderCode",
        success: false,
      });
    }

    // Redirect về frontend với thông tin hủy
    const frontendUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/payment/cancel?orderCode=${orderCode}`;

    return res.redirect(frontendUrl);
  } catch (error) {
    console.error("Payment cancel redirect error:", error);
    return res.status(500).json({
      message: "Lỗi xử lý redirect hủy",
      error: error.message,
      success: false,
    });
  }
};
