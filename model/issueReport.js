const mongoose = require("mongoose");
const schema = mongoose.Schema;

const issueReportSchema = new schema(
  {
    issue_type_id: {
      type: mongoose.Types.ObjectId,
      ref: "IssueType",
      required: true,
    },
    appointment_id: {
      type: mongoose.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    issue_description: {
      type: String,
      required: true,
    },
    solution_applied: {
      type: String,
      required: true,
    },
    parts_used: [
      {
        part_id: {
          type: mongoose.Types.ObjectId,
          ref: "Part",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unit_cost: {
          type: Number,
          required: true,
        },
      },
    ],
    total_parts_cost: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

issueReportSchema.pre("save", function (next) {
  if (this.parts_used && this.parts_used.length > 0) {
    this.total_parts_cost = this.parts_used.reduce(
      (total, part) => total + part.quantity * part.unit_cost,
      0
    );
  } else {
    this.total_parts_cost = 0;
  }
  next();
});

const IssueReport = mongoose.model("IssueReport", issueReportSchema);
module.exports = IssueReport;
