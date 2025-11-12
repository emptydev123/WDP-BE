const cron = require("node-cron");
const Payment = require("../model/payment");

/**
 * Check và cập nhật trạng thái của các payment đã hết timeout
 */
async function checkPaymentTimeouts() {
  try {
    const now = new Date();

    // Tìm các payment PENDING đã hết timeout
    const timeoutPayments = await Payment.find({
      status: "PENDING",
      timeoutAt: { $lt: now },
    });

    // Cập nhật trạng thái thành TIMEOUT
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

    await Promise.all(updatePromises);
  } catch (error) {
    return error;
  }
}

// Chạy mỗi 30 giây để check timeout (vì timeout chỉ 60 giây)
cron.schedule("*/30 * * * * *", checkPaymentTimeouts);

module.exports = { checkPaymentTimeouts };
