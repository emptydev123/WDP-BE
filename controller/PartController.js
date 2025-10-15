// controller/PartController.js
const Part = require("../model/parts");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

// Lấy tất cả parts
exports.getAllParts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
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
    if (search) {
      filter.$or = [
        { part_name: { $regex: search, $options: "i" } },
        { part_number: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pagination = createPagination(validatedPage, validatedLimit);

    const parts = await Part.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const totalItems = await Part.countDocuments(filter);
    const paginationData = {
      ...pagination,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / pagination.limit),
      has_next_page:
        pagination.current_page < Math.ceil(totalItems / pagination.limit),
      has_prev_page: pagination.current_page > 1,
    };

    const response = createPaginatedResponse(
      parts,
      paginationData,
      "Lấy danh sách parts thành công"
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all parts error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách parts",
      error: error.message,
      success: false,
    });
  }
};

// Lấy part theo ID
exports.getPartById = async (req, res) => {
  try {
    const { partId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!partId) {
      return res.status(400).json({
        message: "Thiếu part ID",
        success: false,
      });
    }

    const part = await Part.findById(partId).lean();

    if (!part) {
      return res.status(404).json({
        message: "Không tìm thấy part",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin part thành công",
      success: true,
      data: part,
    });
  } catch (error) {
    console.error("Get part by ID error:", error);
    return res.status(500).json({
      message: "Lỗi lấy thông tin part",
      error: error.message,
      success: false,
    });
  }
};

// Tạo part mới
exports.createPart = async (req, res) => {
  try {
    const {
      part_number,
      part_name,
      description,
      cost_price,
      unit_price,
      supplier,
      warranty_month,
    } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!part_name) {
      return res.status(400).json({
        message: "Thiếu tên part",
        success: false,
      });
    }

    if (!cost_price) {
      return res.status(400).json({
        message: "Thiếu giá gốc (cost_price)",
        success: false,
      });
    }

    if (!unit_price) {
      return res.status(400).json({
        message: "Thiếu giá bán (unit_price)",
        success: false,
      });
    }

    if (part_number) {
      const existingPart = await Part.findOne({ part_number });
      if (existingPart) {
        return res.status(400).json({
          message: "Part number đã tồn tại",
          success: false,
        });
      }
    }

    const part = new Part({
      part_number,
      part_name,
      description,
      cost_price,
      unit_price,
      supplier,
      warranty_month,
    });

    await part.save();

    return res.status(201).json({
      message: "Tạo part thành công",
      success: true,
      data: part,
    });
  } catch (error) {
    console.error("Create part error:", error);
    return res.status(500).json({
      message: "Lỗi tạo part",
      error: error.message,
      success: false,
    });
  }
};

// Cập nhật part
exports.updatePart = async (req, res) => {
  try {
    const { partId } = req.params;
    const {
      part_number,
      part_name,
      description,
      cost_price,
      unit_price,
      supplier,
      warranty_month,
    } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!partId) {
      return res.status(400).json({
        message: "Thiếu part ID",
        success: false,
      });
    }

    const part = await Part.findById(partId);
    if (!part) {
      return res.status(404).json({
        message: "Không tìm thấy part",
        success: false,
      });
    }

    if (part_number && part_number !== part.part_number) {
      const existingPart = await Part.findOne({ part_number });
      if (existingPart) {
        return res.status(400).json({
          message: "Part number đã tồn tại",
          success: false,
        });
      }
    }

    if (part_number !== undefined) part.part_number = part_number;
    if (part_name !== undefined) part.part_name = part_name;
    if (description !== undefined) part.description = description;
    if (cost_price !== undefined) part.cost_price = cost_price;
    if (unit_price !== undefined) part.unit_price = unit_price;
    if (supplier !== undefined) part.supplier = supplier;
    if (warranty_month !== undefined) part.warranty_month = warranty_month;

    await part.save();

    return res.status(200).json({
      message: "Cập nhật part thành công",
      success: true,
      data: part,
    });
  } catch (error) {
    console.error("Update part error:", error);
    return res.status(500).json({
      message: "Lỗi cập nhật part",
      error: error.message,
      success: false,
    });
  }
};

// Xóa part
exports.deletePart = async (req, res) => {
  try {
    const { partId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!partId) {
      return res.status(400).json({
        message: "Thiếu part ID",
        success: false,
      });
    }

    const part = await Part.findById(partId);
    if (!part) {
      return res.status(404).json({
        message: "Không tìm thấy part",
        success: false,
      });
    }

    const Inventory = require("../model/inventory");
    const inventoryUsingPart = await Inventory.findOne({ part_id: partId });

    if (inventoryUsingPart) {
      return res.status(400).json({
        message: "Không thể xóa part vì đang được sử dụng trong inventory",
        success: false,
        data: {
          part_id: partId,
          inventory_id: inventoryUsingPart._id,
          center_id: inventoryUsingPart.center_id,
        },
      });
    }

    await Part.findByIdAndDelete(partId);

    return res.status(200).json({
      message: "Xóa part thành công",
      success: true,
    });
  } catch (error) {
    console.error("Delete part error:", error);
    return res.status(500).json({
      message: "Lỗi xóa part",
      error: error.message,
      success: false,
    });
  }
};
