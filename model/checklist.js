const mongoose = require("mongoose");
const schema = mongoose.Schema;

const checklistSchema = new schema(
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
    parts: [
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
      },
    ],
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "canceled"],
      default: "pending",
    },
    cancellation_note: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const Checklist = mongoose.model("Checklist", checklistSchema);
module.exports = Checklist;
