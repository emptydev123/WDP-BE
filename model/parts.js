const mongoose = require("mongoose");
const schema = mongoose.Schema;
const partSchema = new schema(
  {
    part_number: {
      type: String,
    },
    part_name: {
      type: String,
    },
    description: {
      type: String,
    },
    cost_price: {
      type: Number,
      required: true,
      // Giá gốc/giá nhập
    },
    unit_price: {
      type: Number,
      required: true,
      // Giá bán
    },
    supplier: {
      type: String,
    },
    warranty_month: {
      type: Number,
    },
  },
  { timestamps: true }
);
const part = mongoose.model("Part", partSchema);
module.exports = part;
