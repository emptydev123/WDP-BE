// controller/IssueTypeController.js
const IssueType = require("../model/issueType");
const IssueReport = require("../model/issueReport");

const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

// Lấy tất cả issue types
exports.getAllIssueTypes = async (req, res) => {
  try {
    const { page = 1, limit = 50, category, severity } = req.query;
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
    if (category) filter.category = category;
    if (severity) filter.severity = severity;

    const total = await IssueType.countDocuments(filter);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const issueTypes = await IssueType.find(filter)
      .sort({ category: 1, severity: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      issueTypes,
      pagination,
      "Lấy danh sách issue types thành công"
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all issue types error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách issue types",
      error: error.message,
      success: false,
    });
  }
};

exports.getIssueTypeById = async (req, res) => {
  try {
    const { issueTypeId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const issueType = await IssueType.findById(issueTypeId);

    if (!issueType) {
      return res.status(404).json({
        message: "Không tìm thấy issue type",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin issue type thành công",
      success: true,
      data: issueType,
    });
  } catch (error) {
    console.error("Get issue type by ID error:", error);
    return res.status(500).json({
      message: "Lỗi lấy thông tin issue type",
      error: error.message,
      success: false,
    });
  }
};

exports.createIssueType = async (req, res) => {
  try {
    const { category, severity } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!category || !severity) {
      return res.status(400).json({
        message: "Thiếu thông tin category hoặc severity",
        success: false,
      });
    }

    const existing = await IssueType.findOne({ category, severity });
    if (existing) {
      return res.status(400).json({
        message: "Issue type này đã tồn tại",
        success: false,
        data: existing,
      });
    }

    const issueType = new IssueType({
      category,
      severity,
    });

    await issueType.save();

    return res.status(201).json({
      message: "Tạo issue type thành công",
      success: true,
      data: issueType,
    });
  } catch (error) {
    console.error("Create issue type error:", error);
    return res.status(500).json({
      message: "Lỗi tạo issue type",
      error: error.message,
      success: false,
    });
  }
};

exports.updateIssueType = async (req, res) => {
  try {
    const { issueTypeId } = req.params;
    const { category, severity } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const issueType = await IssueType.findById(issueTypeId);
    if (!issueType) {
      return res.status(404).json({
        message: "Không tìm thấy issue type",
        success: false,
      });
    }

    if (category || severity) {
      const checkCategory = category || issueType.category;
      const checkSeverity = severity || issueType.severity;

      const existing = await IssueType.findOne({
        _id: { $ne: issueTypeId },
        category: checkCategory,
        severity: checkSeverity,
      });

      if (existing) {
        return res.status(400).json({
          message: "Issue type này đã tồn tại",
          success: false,
        });
      }
    }

    if (category) issueType.category = category;
    if (severity) issueType.severity = severity;

    await issueType.save();

    return res.status(200).json({
      message: "Cập nhật issue type thành công",
      success: true,
      data: issueType,
    });
  } catch (error) {
    console.error("Update issue type error:", error);
    return res.status(500).json({
      message: "Lỗi cập nhật issue type",
      error: error.message,
      success: false,
    });
  }
};

exports.deleteIssueType = async (req, res) => {
  try {
    const { issueTypeId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const issueType = await IssueType.findById(issueTypeId);
    if (!issueType) {
      return res.status(404).json({
        message: "Không tìm thấy issue type",
        success: false,
      });
    }

    const reportCount = await IssueReport.countDocuments({
      issue_type_id: issueTypeId,
    });

    if (reportCount > 0) {
      return res.status(400).json({
        message: `Không thể xóa issue type vì có ${reportCount} issue reports đang sử dụng`,
        success: false,
      });
    }

    await IssueType.findByIdAndDelete(issueTypeId);

    return res.status(200).json({
      message: "Xóa issue type thành công",
      success: true,
    });
  } catch (error) {
    console.error("Delete issue type error:", error);
    return res.status(500).json({
      message: "Lỗi xóa issue type",
      error: error.message,
      success: false,
    });
  }
};
