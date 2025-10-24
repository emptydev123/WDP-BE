// controller/IssueReportController.js
const IssueReport = require("../model/issueReport");
const IssueType = require("../model/issueType");
const Appointment = require("../model/appointment");
const Part = require("../model/parts");
const User = require("../model/user");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

exports.getAllIssueReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, appointment_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );
    const filter = {};
    if (appointment_id) filter.appointment_id = appointment_id;

    const total = await IssueReport.countDocuments(filter);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const reports = await IssueReport.find(filter)
      .populate("issue_type_id")
      .populate("appointment_id", "appoinment_date status")
      .populate("parts_used.part_id")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      reports,
      pagination,
      "Lấy danh sách issue reports thành công"
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all issue reports error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách issue reports",
      error: error.message,
      success: false,
    });
  }
};

exports.getIssueReportsByAppointment = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const reports = await IssueReport.find({ appointment_id })
      .populate("issue_type_id")
      .populate("parts_used.part_id")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Lấy danh sách issue reports thành công",
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error("Get issue reports by appointment error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách issue reports",
      error: error.message,
      success: false,
    });
  }
};

exports.createIssueReport = async (req, res) => {
  try {
    const technician_id = req._id?.toString();
    const {
      appointment_id,
      issue_type_id,
      issue_description,
      solution_applied,
      parts_used,
    } = req.body;

    if (!technician_id) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (
      !appointment_id ||
      !issue_type_id ||
      !issue_description ||
      !solution_applied
    ) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointment_id);
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment không tồn tại",
        success: false,
      });
    }

    // if (appointment.assigned?.toString() !== technician_id) {
    //   return res.status(403).json({
    //     message: "Bạn không có quyền tạo report cho appointment này",
    //     success: false,
    //   });
    // }

    const issueType = await IssueType.findById(issue_type_id);
    if (!issueType) {
      return res.status(404).json({
        message: "Issue type không hợp lệ",
        success: false,
      });
    }

    if (parts_used && parts_used.length > 0) {
      for (const part of parts_used) {
        if (!part.part_id || !part.quantity || !part.unit_cost) {
          return res.status(400).json({
            message: "Mỗi part cần có đầy đủ part_id, quantity, và unit_cost",
            success: false,
          });
        }
      }

      const partIds = parts_used.map((p) => p.part_id);
      const existingParts = await Part.find({ _id: { $in: partIds } });

      if (existingParts.length !== partIds.length) {
        return res.status(404).json({
          message: "Một số part không tồn tại",
          success: false,
        });
      }
    }

    const issueReport = new IssueReport({
      issue_type_id,
      appointment_id,
      issue_description,
      solution_applied,
      parts_used: parts_used || [],
    });

    await issueReport.save();
    await issueReport.populate([
      { path: "issue_type_id" },
      { path: "parts_used.part_id" },
    ]);

    await Appointment.findByIdAndUpdate(
      appointment_id,
      { status: "completed" },
      { new: true }
    );

    return res.status(201).json({
      message: "Tạo issue report thành công và cập nhật appointment status",
      success: true,
      data: issueReport,
    });
  } catch (error) {
    console.error("Create issue report error:", error);
    return res.status(500).json({
      message: "Lỗi tạo issue report",
      error: error.message,
      success: false,
    });
  }
};

exports.updateIssueReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const technician_id = req._id?.toString();
    const { issue_type_id, issue_description, solution_applied, parts_used } =
      req.body;

    if (!technician_id) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const report = await IssueReport.findById(reportId).populate(
      "appointment_id"
    );
    if (!report) {
      return res.status(404).json({
        message: "Report không tồn tại",
        success: false,
      });
    }

    // if (report.appointment_id.assigned?.toString() !== technician_id) {
    //   return res.status(403).json({
    //     message: "Bạn không có quyền sửa report này",
    //     success: false,
    //   });
    // }

    if (issue_type_id) {
      const issueType = await IssueType.findById(issue_type_id);
      if (!issueType) {
        return res.status(404).json({
          message: "Issue type không hợp lệ",
          success: false,
        });
      }
      report.issue_type_id = issue_type_id;
    }

    if (issue_description) report.issue_description = issue_description;
    if (solution_applied) report.solution_applied = solution_applied;
    if (parts_used !== undefined) report.parts_used = parts_used;

    await report.save();

    await report.populate([
      { path: "issue_type_id" },
      {
        path: "parts_used",
        populate: { path: "part_id" },
      },
    ]);

    return res.status(200).json({
      message: "Cập nhật issue report thành công",
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Update issue report error:", error);
    return res.status(500).json({
      message: "Lỗi cập nhật issue report",
      error: error.message,
      success: false,
    });
  }
};

exports.deleteIssueReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const technician_id = req._id?.toString();

    if (!technician_id) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const report = await IssueReport.findById(reportId).populate(
      "appointment_id"
    );
    if (!report) {
      return res.status(404).json({
        message: "Report không tồn tại",
        success: false,
      });
    }

    if (report.appointment_id.assigned?.toString() !== technician_id) {
      return res.status(403).json({
        message: "Bạn không có quyền xóa report này",
        success: false,
      });
    }

    await IssueReport.findByIdAndDelete(reportId);

    return res.status(200).json({
      message: "Xóa issue report thành công",
      success: true,
    });
  } catch (error) {
    console.error("Delete issue report error:", error);
    return res.status(500).json({
      message: "Lỗi xóa issue report",
      error: error.message,
      success: false,
    });
  }
};
