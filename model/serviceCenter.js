const mongoose = require("mongoose");
const schema = mongoose.Schema;
const serviceCenterSchema = new schema(
  {
    center_name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",

    },
    phone: {
      type: String
    },
    is_active: {
      type: Boolean,
      default: true
    }

  }, { timestamps: true })
const serviceCenter = mongoose.model("ServiceCenter", serviceCenterSchema);
module.exports = serviceCenter;