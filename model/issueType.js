const mongoose = require("mongoose");
const schema = mongoose.Schema;

const issueTypeSchema = new schema(
  {
    category: {
      type: String,
      required: true,
      enum: [
        "battery",
        "motor",
        "charging",
        "brake",
        "cooling",
        "electrical",
        "software",
        "mechanical",
        "suspension",
        "tire",
        "other",
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ["minor", "moderate", "major", "critical"],
    },
  },
  { timestamps: true }
);

const IssueType = mongoose.model("IssueType", issueTypeSchema);
module.exports = IssueType;
