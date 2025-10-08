// controller/ServiceCenterController.js
const ServiceCenter = require("../model/serviceCenter");
const User = require("../model/user");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

exports.getAllServiceCenters = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, is_active } = req.query;
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

    const filter = { is_active: true };
    if (search) {
      filter.$or = [
        { center_name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    if (is_active === "false") {
      filter.is_active = false;
    } else if (is_active === "all") {
      delete filter.is_active;
    }

    const pagination = createPagination(validatedPage, validatedLimit);

    const serviceCenters = await ServiceCenter.find(filter)
      .populate("user_id", "username fullName email phone role")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const totalItems = await ServiceCenter.countDocuments(filter);
    const paginationData = {
      ...pagination,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / pagination.limit),
      has_next_page:
        pagination.current_page < Math.ceil(totalItems / pagination.limit),
      has_prev_page: pagination.current_page > 1,
    };

    const response = createPaginatedResponse(
      serviceCenters,
      paginationData,
      "Lấy danh sách service centers thành công"
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all service centers error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách service centers",
      error: error.message,
      success: false,
    });
  }
};

exports.getServiceCenterById = async (req, res) => {
  try {
    const { centerId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!centerId) {
      return res.status(400).json({
        message: "Thiếu center ID",
        success: false,
      });
    }

    const serviceCenter = await ServiceCenter.findById(centerId)
      .populate("user_id", "username fullName email phone role")
      .lean();

    if (!serviceCenter) {
      return res.status(404).json({
        message: "Không tìm thấy service center",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin service center thành công",
      success: true,
      data: serviceCenter,
    });
  } catch (error) {
    console.error("Get service center by ID error:", error);
    return res.status(500).json({
      message: "Lỗi lấy thông tin service center",
      error: error.message,
      success: false,
    });
  }
};

exports.createServiceCenter = async (req, res) => {
  try {
    const { center_name, address, user_id } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!center_name || !user_id) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc (center_name, user_id)",
        success: false,
      });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy user",
        success: false,
      });
    }

    const existingCenter = await ServiceCenter.findOne({
      center_name,
      is_active: true,
    });
    if (existingCenter) {
      return res.status(400).json({
        message: "Tên service center đã tồn tại",
        success: false,
      });
    }

    const serviceCenter = new ServiceCenter({
      center_name,
      address,
      user_id,
      is_active: true,
    });

    await serviceCenter.save();

    const populatedCenter = await ServiceCenter.findById(
      serviceCenter._id
    ).populate("user_id", "username fullName email phone role");

    return res.status(201).json({
      message: "Tạo service center thành công",
      success: true,
      data: populatedCenter,
    });
  } catch (error) {
    console.error("Create service center error:", error);
    return res.status(500).json({
      message: "Lỗi tạo service center",
      error: error.message,
      success: false,
    });
  }
};

exports.updateServiceCenter = async (req, res) => {
  try {
    const { centerId } = req.params;
    const { center_name, address, user_id, is_active } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!centerId) {
      return res.status(400).json({
        message: "Thiếu center ID",
        success: false,
      });
    }

    const serviceCenter = await ServiceCenter.findById(centerId);
    if (!serviceCenter) {
      return res.status(404).json({
        message: "Không tìm thấy service center",
        success: false,
      });
    }

    if (center_name && center_name !== serviceCenter.center_name) {
      const existingCenter = await ServiceCenter.findOne({
        center_name,
        is_active: true,
      });
      if (existingCenter) {
        return res.status(400).json({
          message: "Tên service center đã tồn tại",
          success: false,
        });
      }
    }

    if (user_id && user_id !== serviceCenter.user_id.toString()) {
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({
          message: "Không tìm thấy user",
          success: false,
        });
      }
    }

    if (center_name !== undefined) serviceCenter.center_name = center_name;
    if (address !== undefined) serviceCenter.address = address;
    if (user_id !== undefined) serviceCenter.user_id = user_id;
    if (is_active !== undefined) serviceCenter.is_active = is_active;

    await serviceCenter.save();

    const updatedCenter = await ServiceCenter.findById(centerId).populate(
      "user_id",
      "username fullName email phone role"
    );

    return res.status(200).json({
      message: "Cập nhật service center thành công",
      success: true,
      data: updatedCenter,
    });
  } catch (error) {
    console.error("Update service center error:", error);
    return res.status(500).json({
      message: "Lỗi cập nhật service center",
      error: error.message,
      success: false,
    });
  }
};
