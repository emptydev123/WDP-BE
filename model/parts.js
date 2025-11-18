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
    supplier: {
      type: String,
    },
    warranty_month: {
      type: Number,
    },
    costPrice: {
      type: Number,
      required: false,
    },
    sellPrice: {
      type: Number,
      required: false,
    },
    type: {
      type: String,
      enum: ["power", "electrical", "brake", "wheel", "saftety"],
      required: false
    },
  },
  { timestamps: true }
);
const part = mongoose.model("Part", partSchema);
module.exports = part;
