const mongoose = require("mongoose");
const schema = mongoose.Schema;

const paymentSchema = new schema(
  {
    order_code: {
      type: Number,
      required: true,
      unique: true,
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
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },

    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },

  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
