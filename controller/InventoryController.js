// controller/InventoryController.js
const Inventory = require("../model/inventory");
const Part = require("../model/parts");
const ServiceCenter = require("../model/serviceCenter");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

// Lấy tất cả inventory
exports.getAllInventory = async (req, res) => {
  try {
    const { page = 1, limit = 10, center_id, part_name, low_stock } = req.query;
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

    const query = {};
    if (center_id) {
      query.center_id = center_id;
    }
    if (part_name) {
      query["part_id.name"] = { $regex: part_name, $options: "i" };
    }
    if (low_stock === "true") {
      query.$expr = {
        $lte: ["$quantity_avaiable", "$minimum_stock"],
      };
    }

    const total = await Inventory.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const inventory = await Inventory.find(query)
      .populate("part_id", "name description part_number category brand")
      .populate("center_id", "name address phone")
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      inventory,
      pagination,
      "Lấy danh sách inventory thành công"
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all inventory error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách inventory",
      error: error.message,
      success: false,
    });
  }
};

// Lấy chi tiết inventory theo ID
exports.getInventoryById = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!inventoryId) {
      return res.status(400).json({
        message: "Thiếu inventory ID",
        success: false,
      });
    }

    const inventory = await Inventory.findById(inventoryId)
      .populate("part_id", "name description part_number category brand")
      .populate("center_id", "name address phone");

    if (!inventory) {
      return res.status(404).json({
        message: "Không tìm thấy inventory",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Lấy chi tiết inventory thành công",
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get inventory by ID error:", error);
    return res.status(500).json({
      message: "Lỗi lấy chi tiết inventory",
      error: error.message,
      success: false,
    });
  }
};

// Tạo inventory mới
exports.createInventory = async (req, res) => {
  try {
    const {
      quantity_avaiable,
      minimum_stock,
      cost_per_unit,
      center_id,
      part_id,
    } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!quantity_avaiable || !center_id || !part_id) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc",
        success: false,
      });
    }

    const part = await Part.findById(part_id);
    if (!part) {
      return res.status(404).json({
        message: "Không tìm thấy part",
        success: false,
      });
    }

    const serviceCenter = await ServiceCenter.findById(center_id);
    if (!serviceCenter) {
      return res.status(404).json({
        message: "Không tìm thấy service center",
        success: false,
      });
    }

    const existingInventory = await Inventory.findOne({
      part_id,
      center_id,
    });

    if (existingInventory) {
      return res.status(400).json({
        message: "Inventory cho part này tại center này đã tồn tại",
        success: false,
      });
    }

    const inventory = new Inventory({
      quantity_avaiable,
      minimum_stock: minimum_stock || 0,
      cost_per_unit,
      center_id,
      part_id,
      last_restocked: new Date(),
    });

    await inventory.save();

    const populatedInventory = await Inventory.findById(inventory._id)
      .populate("part_id", "name description part_number category brand")
      .populate("center_id", "name address phone");

    return res.status(201).json({
      message: "Tạo inventory thành công",
      success: true,
      data: populatedInventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error);
    return res.status(500).json({
      message: "Lỗi tạo inventory",
      error: error.message,
      success: false,
    });
  }
};

// Cập nhật inventory
exports.updateInventory = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { quantity_avaiable, minimum_stock, cost_per_unit, last_restocked } =
      req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!inventoryId) {
      return res.status(400).json({
        message: "Thiếu inventory ID",
        success: false,
      });
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({
        message: "Không tìm thấy inventory",
        success: false,
      });
    }

    const updateData = {};
    if (quantity_avaiable !== undefined)
      updateData.quantity_avaiable = quantity_avaiable;
    if (minimum_stock !== undefined) updateData.minimum_stock = minimum_stock;
    if (cost_per_unit !== undefined) updateData.cost_per_unit = cost_per_unit;
    if (last_restocked !== undefined)
      updateData.last_restocked = new Date(last_restocked);

    const updatedInventory = await Inventory.findByIdAndUpdate(
      inventoryId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("part_id", "name description part_number category brand")
      .populate("center_id", "name address phone");

    return res.status(200).json({
      message: "Cập nhật inventory thành công",
      success: true,
      data: updatedInventory,
    });
  } catch (error) {
    console.error("Update inventory error:", error);
    return res.status(500).json({
      message: "Lỗi cập nhật inventory",
      error: error.message,
      success: false,
    });
  }
};

// Xóa inventory
exports.deleteInventory = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!inventoryId) {
      return res.status(400).json({
        message: "Thiếu inventory ID",
        success: false,
      });
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({
        message: "Không tìm thấy inventory",
        success: false,
      });
    }

    const Appointment = require("../model/appointment");
    const appointmentUsingInventory = await Appointment.findOne({
      $or: [
        { center_id: inventory.center_id },
        { vehicle_id: { $exists: true } },
      ],
    });

    if (appointmentUsingInventory) {
      return res.status(400).json({
        message:
          "Không thể xóa inventory vì center đang được sử dụng trong appointments",
        success: false,
        data: {
          inventory_id: inventoryId,
          appointment_id: appointmentUsingInventory._id,
          center_id: inventory.center_id,
        },
      });
    }

    await Inventory.findByIdAndDelete(inventoryId);

    return res.status(200).json({
      message: "Xóa inventory thành công",
      success: true,
    });
  } catch (error) {
    console.error("Delete inventory error:", error);
    return res.status(500).json({
      message: "Lỗi xóa inventory",
      error: error.message,
      success: false,
    });
  }
};
