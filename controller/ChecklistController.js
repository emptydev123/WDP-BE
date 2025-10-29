// controller/ChecklistController.js
const Checklist = require("../model/checklist");
const IssueType = require("../model/issueType");
const Appointment = require("../model/appointment");
const Part = require("../model/parts");
const Inventory = require("../model/inventory");
const User = require("../model/user");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

exports.getAllChecklists = async (req, res) => {
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

    const total = await Checklist.countDocuments(filter);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const checklists = await Checklist.find(filter)
      .populate("issue_type_id")
      .populate("appointment_id", "appoinment_date status")
      .populate("parts.part_id")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      checklists,
      pagination,
      "Lấy danh sách checklist thành công"
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all checklists error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách checklist",
      error: error.message,
      success: false,
    });
  }
};

exports.createChecklist = async (req, res) => {
  try {
    const technician_id = req._id?.toString();
    const {
      appointment_id,
      issue_type_id,
      issue_description,
      solution_applied,
      parts,
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

    // Kiểm tra technician có được assign cho appointment này không
    // if (appointment.technician_id?.toString() !== technician_id) {
    //   return res.status(403).json({
    //     message: "Bạn không có quyền tạo checklist cho appointment này",
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

    if (parts && parts.length > 0) {
      for (const part of parts) {
        if (!part.part_id || !part.quantity) {
          return res.status(400).json({
            message: "Mỗi part cần có đầy đủ part_id và quantity",
            success: false,
          });
        }
      }

      const partIds = parts.map((p) => p.part_id);
      const existingParts = await Part.find({ _id: { $in: partIds } });

      if (existingParts.length !== partIds.length) {
        return res.status(404).json({
          message: "Một số part không tồn tại",
          success: false,
        });
      }
    }

    const checklist = new Checklist({
      issue_type_id,
      appointment_id,
      issue_description,
      solution_applied,
      parts: parts || [],
      status: "pending", // Tech tạo checklist với status pending
    });

    await checklist.save();
    await checklist.populate([
      { path: "issue_type_id" },
      { path: "parts.part_id" },
    ]);

    return res.status(201).json({
      message: "Tạo checklist thành công",
      success: true,
      data: checklist,
    });
  } catch (error) {
    console.error("Create checklist error:", error);
    return res.status(500).json({
      message: "Lỗi tạo checklist",
      error: error.message,
      success: false,
    });
  }
};

// Staff accept checklist - update inventory and calculate cost
exports.acceptChecklist = async (req, res) => {
  try {
    const staff_id = req._id?.toString();
    const { checklistId } = req.params;

    if (!staff_id) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Kiểm tra role staff
    // const user = await User.findById(staff_id);
    // if (!["admin", "staff"].includes(user?.role)) {
    //   return res.status(403).json({
    //     message: "Access denied. Staff role required",
    //     success: false,
    //   });
    // }

    const checklist = await Checklist.findById(checklistId).populate([
      { path: "appointment_id" },
      { path: "parts.part_id" },
    ]);

    if (!checklist) {
      return res.status(404).json({
        message: "Checklist không tồn tại",
        success: false,
      });
    }

    if (checklist.status !== "pending") {
      return res.status(400).json({
        message: "Checklist đã được xử lý",
        success: false,
      });
    }

    const appointment = checklist.appointment_id;

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment không tồn tại",
        success: false,
      });
    }

    let totalCost = 0;
    const inventoryUpdates = [];

    // Kiểm tra inventory và tính cost cho tất cả parts
    // Lấy giá từ inventory.cost_per_unit thay vì từ parts
    for (const part of checklist.parts) {
      // Đảm bảo part_id đã được populate
      const partId = part.part_id?._id || part.part_id;

      // Tìm inventory cho part này
      const inventory = await Inventory.findOne({
        part_id: partId,
        center_id: appointment.center_id,
      });

      if (!inventory) {
        return res.status(400).json({
          message: `Không tìm thấy inventory cho part: ${partId}`,
          success: false,
        });
      }

      // Lấy giá từ inventory.cost_per_unit
      const unitCost = inventory.cost_per_unit || 0;

      if (!unitCost || unitCost <= 0) {
        console.error(
          `Inventory cho part ${partId} không có giá hợp lệ (cost_per_unit):`,
          inventory
        );
        return res.status(400).json({
          message: `Inventory cho part ${partId} không có giá (cost_per_unit)`,
          success: false,
        });
      }

      // Kiểm tra số lượng tồn kho (dùng quantity_avaiable - có lỗi chính tả trong schema)
      const currentQuantity =
        inventory.quantity_avaiable || inventory.quantity || 0;

      if (currentQuantity < part.quantity) {
        return res.status(400).json({
          message: `Không đủ hàng trong kho cho part: ${partId}. Có: ${currentQuantity}, Cần: ${part.quantity}`,
          success: false,
        });
      }

      // Tính cost từ inventory.cost_per_unit
      const partCost = unitCost * part.quantity;
      totalCost += partCost;

      console.log(
        `Part ${partId}: ${unitCost} × ${part.quantity} = ${partCost} (từ inventory.cost_per_unit)`
      );

      // Lưu lại để cập nhật inventory sau
      inventoryUpdates.push({
        inventoryId: inventory._id,
        quantity: -part.quantity,
        partId: partId,
      });
    }

    console.log(`Tổng cost: ${totalCost}`);
    console.log(`Cập nhật ${inventoryUpdates.length} inventory items cùng lúc`);

    // Cập nhật TẤT CẢ inventory cùng lúc (atomic updates)
    // Sử dụng Promise.all để update song song nhiều inventory items
    const inventoryUpdateResults = await Promise.all(
      inventoryUpdates.map(async (update) => {
        const result = await Inventory.findByIdAndUpdate(
          update.inventoryId,
          { $inc: { quantity_avaiable: update.quantity } }, // Update quantity_avaiable
          { new: true }
        );
        console.log(
          `✅ Updated inventory ${update.inventoryId} for part ${update.partId}: quantity_avaiable = ${result.quantity_avaiable}`
        );
        return result;
      })
    );

    // Cập nhật checklist status thành accepted
    checklist.status = "accepted";
    await checklist.save();

    // Cập nhật appointment với estimated cost
    await Appointment.findByIdAndUpdate(appointment._id, {
      estimated_cost: totalCost,
    });

    // Reload checklist với populate để có đầy đủ thông tin
    const updatedChecklist = await Checklist.findById(checklistId)
      .populate("issue_type_id")
      .populate("appointment_id")
      .populate("parts.part_id")
      .lean();

    console.log(
      `Checklist ${checklistId} updated. Status = ${updatedChecklist.status}, Total cost = ${totalCost} (saved to appointment)`
    );

    return res.status(200).json({
      message: "Checklist đã được chấp nhận, inventory đã cập nhật",
      success: true,
      data: {
        checklist: updatedChecklist,
        totalCost,
        inventoryUpdated: inventoryUpdateResults.length,
      },
    });
  } catch (error) {
    console.error("Accept checklist error:", error);
    return res.status(500).json({
      message: "Lỗi chấp nhận checklist",
      error: error.message,
      success: false,
    });
  }
};

// Tech complete checklist
exports.completeChecklist = async (req, res) => {
  try {
    const technician_id = req._id?.toString();
    const { checklistId } = req.params;

    if (!technician_id) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const checklist = await Checklist.findById(checklistId).populate(
      "appointment_id"
    );
    if (!checklist) {
      return res.status(404).json({
        message: "Checklist không tồn tại",
        success: false,
      });
    }

    // Kiểm tra technician có quyền
    // if (checklist.appointment_id.technician_id?.toString() !== technician_id) {
    //   return res.status(403).json({
    //     message: "Bạn không có quyền hoàn thành checklist này",
    //     success: false,
    //   });
    // }

    if (checklist.status !== "accepted") {
      return res.status(400).json({
        message: "Checklist chưa được staff chấp nhận",
        success: false,
      });
    }

    // Cập nhật status thành completed
    checklist.status = "completed";
    await checklist.save();

    // Cập nhật appointment status thành completed
    await Appointment.findByIdAndUpdate(checklist.appointment_id._id, {
      status: "completed",
    });

    await checklist.populate([
      { path: "issue_type_id" },
      { path: "parts.part_id" },
    ]);

    return res.status(200).json({
      message: "Checklist đã hoàn thành",
      success: true,
      data: checklist,
    });
  } catch (error) {
    console.error("Complete checklist error:", error);
    return res.status(500).json({
      message: "Lỗi hoàn thành checklist",
      error: error.message,
      success: false,
    });
  }
};
