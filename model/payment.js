const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    orderCode: {
      type: Number,
      unique: true,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "CANCELLED", "EXPIRED", "TIMEOUT"],
      default: "PENDING",
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    paidAt: Date,
    cancelledAt: Date,
    expiredAt: Date,
    timeoutAt: {
      type: Date,
      required: true,
    },
    retryOf: Number, // orderCode cũ nếu là đơn retry
    replacedBy: Number, // orderCode mới nếu bị thay thế
    customer: { type: Object, default: undefined },
    checkoutUrl: String,
    qrCode: String,
    paymentLinkId: String,
    lastWebhook: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Payment", PaymentSchema);
