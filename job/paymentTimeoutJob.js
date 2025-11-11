const cron = require('node-cron');
const Payment = require('../model/payment');

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

    if (timeoutPayments.length === 0) {
      console.log(`[Payment Timeout Job] No timeout payments found`);
      return;
    }

    console.log(
      `[Payment Timeout Job] Found ${timeoutPayments.length} timeout payments. Updating...`
    );

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

    console.log(
      `[Payment Timeout Job] Updated ${timeoutPayments.length} payments to TIMEOUT status`
    );
  } catch (error) {
    console.error("[Payment Timeout Job] Error:", error);
  }
}

// Chạy mỗi 30 giây để check timeout (vì timeout chỉ 60 giây)
cron.schedule('*/30 * * * * *', checkPaymentTimeouts);

console.log('[Payment Timeout Job] Scheduled to run every 30 seconds');

module.exports = { checkPaymentTimeouts };
