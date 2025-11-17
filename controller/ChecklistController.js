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
    const {
      page = 1,
      limit = 10,
      appointment_id,
      technicianId,
      date_from,
      date_to,
    } = req.query;
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

    // Lọc theo ngày tháng
    if (date_from || date_to) {
      filter.createdAt = {};
      if (date_from) {
        const fromDate = new Date(date_from);
        fromDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = fromDate;
      }
      if (date_to) {
        const toDate = new Date(date_to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    // Lọc theo technicianId thông qua appointment
    if (technicianId) {
      const appointmentsWithTechnician = await Appointment.find({
        technician_id: technicianId,
      }).select("_id");
      const appointmentIds = appointmentsWithTechnician.map((a) => a._id);
      if (appointmentIds.length > 0) {
        // Nếu có cả appointment_id và technicianId, lọc cả hai
        if (appointment_id) {
          // Kiểm tra appointment_id có trong danh sách appointments của technician không
          const appointmentIdStr = appointment_id.toString();
          if (appointmentIds.some((id) => id.toString() === appointmentIdStr)) {
            filter.appointment_id = appointment_id;
          } else {
            // Appointment không thuộc technician này
            filter.appointment_id = { $in: [] };
          }
        } else {
          filter.appointment_id = { $in: appointmentIds };
        }
      } else {
        // Nếu không có appointment nào với technician này, trả về empty
        filter.appointment_id = { $in: [] };
      }
    } else if (appointment_id) {
      // Chỉ có appointment_id, không có technicianId
      filter.appointment_id = appointment_id;
    }

    const total = await Checklist.countDocuments(filter);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const checklists = await Checklist.find(filter)
      .populate("issue_type_id")
      .populate({
        path: "appointment_id",
        select:
          "appoinment_date status technician_id user_id center_id vehicle_id",
        populate: [
          {
            path: "technician_id",
            select: "fullName username email phoneNumber role",
          },
          {
            path: "user_id",
            select: "fullName username email phoneNumber role",
          },
          { path: "center_id", select: "center_name address phone" },
          {
            path: "vehicle_id",
            select: "license_plate vin color model_id",
            populate: {
              path: "model_id",
              select: "brand model_name",
            },
          },
        ],
      })
      .populate("parts.part_id", "part_name part_number sellPrice costPrice")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    // Tính lại total_cost nếu chưa có hoặc cần cập nhật (từ sellPrice của parts)
    const checklistsWithTotalCost = checklists.map((checklist) => {
      // Nếu total_cost đã có trong DB thì dùng, nếu không thì tính lại
      if (checklist.total_cost !== undefined && checklist.total_cost !== null) {
        return checklist;
      }

      // Tính lại total_cost từ parts
      let total_cost = 0;
      if (checklist.parts && checklist.parts.length > 0) {
        checklist.parts.forEach((part) => {
          const partData = part.part_id;
          const sellPrice = partData?.sellPrice || 0;
          const quantity = part.quantity || 0;
          total_cost += sellPrice * quantity;
        });
      }
      return {
        ...checklist,
        total_cost: total_cost,
      };
    });

    const response = createPaginatedResponse(
      checklistsWithTotalCost,
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

// Tạo checkin - ghi nhận tình trạng ban đầu của xe trước khi khám xe
exports.createCheckin = async (req, res) => {
  try {
    const technician_id = req._id?.toString();
    const { appointment_id, initial_vehicle_condition } = req.body;

    if (!technician_id) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!appointment_id || !initial_vehicle_condition) {
      return res.status(400).json({
        message:
          "Thiếu thông tin bắt buộc (appointment_id, initial_vehicle_condition)",
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

    // Kiểm tra appointment status phải là "assigned" để có thể tạo checkin
    if (appointment.status !== "assigned") {
      return res.status(400).json({
        message:
          "Chỉ có thể tạo checkin cho appointment có trạng thái 'assigned'",
        success: false,
      });
    }

    // Kiểm tra appointment đã được check-in chưa (tránh tạo checkin nhiều lần)
    if (appointment.checkin_datetime || appointment.check_in_time) {
      return res.status(400).json({
        message: "Appointment đã được check-in rồi",
        success: false,
      });
    }

    // Tạo checkin - ghi nhận tình trạng ban đầu của xe
    appointment.status = "check_in";
    appointment.checkin_datetime = new Date();
    appointment.check_in_type = "offline"; // Technician tạo checkin là check-in offline
    appointment.check_in_time = new Date();
    appointment.initial_vehicle_condition = initial_vehicle_condition; // Lưu tình trạng ban đầu của xe
    await appointment.save();

    // Emit socket event to notify customer and technician rooms
    try {
      const io = req.app.get("io");
      if (io) {
        const customerRoom = appointment.user_id?.toString();
        const technicianRoom = appointment.technician_id?.toString();
        const payload = {
          appointment_id: appointment._id,
          status: appointment.status,
        };
        if (customerRoom)
          io.to(customerRoom).emit("appointment_updated", payload);
        if (technicianRoom)
          io.to(technicianRoom).emit("appointment_updated", payload);
      }
    } catch (e) {
      console.error("Socket emit error (createCheckin):", e?.message || e);
    }

    // Populate appointment với thông tin đầy đủ
    await appointment.populate([
      {
        path: "checkin_by",
        select: "username fullName email phone role",
      },
      {
        path: "user_id",
        select: "username fullName email phoneNumber",
      },
      {
        path: "technician_id",
        select: "username fullName email phoneNumber role",
      },
    ]);

    return res.status(201).json({
      message: "Tạo checkin thành công",
      success: true,
      data: {
        appointment: {
          _id: appointment._id,
          status: appointment.status,
          initial_vehicle_condition: appointment.initial_vehicle_condition,
          checkin_datetime: appointment.checkin_datetime,
          checkin_by: appointment.checkin_by,
        },
      },
    });
  } catch (error) {
    console.error("Create checkin error:", error);
    return res.status(500).json({
      message: "Lỗi tạo checkin",
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
        message:
          "Thiếu thông tin bắt buộc (appointment_id, issue_type_id, issue_description, solution_applied)",
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

    // Kiểm tra appointment phải đã được check-in trước khi tạo checklist
    if (appointment.status !== "check_in") {
      return res.status(400).json({
        message:
          "Appointment phải được check-in trước khi tạo checklist. Vui lòng tạo checkin trước.",
        success: false,
      });
    }

    // Kiểm tra appointment đã có checklist chưa (tránh tạo checklist nhiều lần)
    const existingChecklist = await Checklist.findOne({ appointment_id });
    if (existingChecklist) {
      return res.status(400).json({
        message: "Appointment đã có checklist rồi",
        success: false,
      });
    }

    const issueType = await IssueType.findById(issue_type_id);
    if (!issueType) {
      return res.status(404).json({
        message: "Issue type không hợp lệ",
        success: false,
      });
    }

    // Tính total_cost từ parts
    let total_cost = 0;
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
      const existingParts = await Part.find({ _id: { $in: partIds } }).select(
        "sellPrice"
      );

      if (existingParts.length !== partIds.length) {
        return res.status(404).json({
          message: "Một số part không tồn tại",
          success: false,
        });
      }

      // Tính total_cost từ sellPrice của các parts
      const partsMap = new Map(existingParts.map((p) => [p._id.toString(), p]));
      parts.forEach((part) => {
        const partData = partsMap.get(part.part_id.toString());
        if (partData && partData.sellPrice) {
          total_cost += partData.sellPrice * part.quantity;
        }
      });
    }

    // Tạo checklist (appointment đã được check-in rồi)
    const checklist = new Checklist({
      issue_type_id,
      appointment_id,
      issue_description,
      solution_applied,
      parts: parts || [],
      status: "pending", // Tech tạo checklist với status pending
      total_cost: total_cost,
    });

    await checklist.save();

    // Emit socket event to notify customer and technician rooms
    try {
      const io = req.app.get("io");
      if (io) {
        const customerRoom = appointment.user_id?.toString();
        const technicianRoom = appointment.technician_id?.toString();
        const payload = {
          appointment_id: appointment._id,
          status: appointment.status,
        };
        if (customerRoom)
          io.to(customerRoom).emit("appointment_updated", payload);
        if (technicianRoom)
          io.to(technicianRoom).emit("appointment_updated", payload);
      }
    } catch (e) {
      console.error("Socket emit error (createChecklist):", e?.message || e);
    }

    // Populate checklist với thông tin đầy đủ
    await checklist.populate([
      { path: "issue_type_id" },
      {
        path: "appointment_id",
        populate: {
          path: "checkin_by",
          select: "username fullName email phone role",
        },
      },
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
      {
        path: "appointment_id",
        populate: {
          path: "user_id",
          select: "_id username fullName email phoneNumber",
        },
      },
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

    // Kiểm tra xem có parts không
    const hasParts = checklist.parts && checklist.parts.length > 0;

    // Chỉ tính toán final_cost (báo giá) nếu có parts
    let totalCost = 0;

    if (hasParts) {
      for (const part of checklist.parts) {
        const partId = part.part_id?._id || part.part_id;

        const inventory = await Inventory.findOne({
          part_id: partId,
          center_id: appointment.center_id,
        }).populate(
          "part_id",
          "part_name description part_number supplier warranty_month costPrice sellPrice"
        );

        if (!inventory) {
          return res.status(400).json({
            message: `Không tìm thấy inventory cho part: ${partId}`,
            success: false,
          });
        }

        // Lấy giá từ part.sellPrice
        const partData = inventory.part_id;
        const unitCost = partData?.sellPrice || 0;

        if (!unitCost || unitCost <= 0) {
          console.error(
            `Part ${partId} không có giá hợp lệ (sellPrice):`,
            partData
          );
          return res.status(400).json({
            message: `Part ${partId} không có giá (sellPrice)`,
            success: false,
          });
        }

        // Tính cost từ part.sellPrice (chỉ để báo giá, chưa trừ inventory)
        const partCost = unitCost * part.quantity;
        totalCost += partCost;

        console.log(
          `Part ${partId}: ${unitCost} × ${part.quantity} = ${partCost} (từ part.sellPrice)`
        );
      }
      console.log(`Tổng cost (báo giá): ${totalCost}`);
    } else {
      console.log(
        "Checklist không có parts, chuyển status thành in_progress ngay"
      );
    }

    // Cập nhật checklist status thành accepted (đã báo giá)
    checklist.status = "accepted";
    await checklist.save();

    // Nếu không có parts → chuyển status thành "in_progress" ngay
    // Nếu có parts → chỉ cập nhật final_cost, chờ thanh toán
    const updateData = {
      final_cost: totalCost,
    };

    if (!hasParts) {
      // Không có parts → chuyển status thành "in_progress" ngay
      updateData.status = "in_progress";
    }

    await Appointment.findByIdAndUpdate(appointment._id, updateData);

    // Emit socket event
    try {
      const io = req.app.get("io");
      if (io) {
        const customerRoom = appointment.user_id?.toString();
        const technicianRoom = appointment.technician_id?.toString();
        const newStatus = hasParts ? appointment.status : "in_progress"; // Nếu không có parts thì status = "in_progress"
        const payload = {
          appointment_id: appointment._id,
          status: newStatus,
          final_cost: totalCost,
        };
        if (customerRoom)
          io.to(customerRoom).emit("appointment_updated", payload);
        if (technicianRoom)
          io.to(technicianRoom).emit("appointment_updated", payload);
      }
    } catch (e) {
      console.error("Socket emit error (acceptChecklist):", e?.message || e);
    }

    // Reload checklist với populate để có đầy đủ thông tin
    const updatedChecklist = await Checklist.findById(checklistId)
      .populate("issue_type_id")
      .populate("appointment_id")
      .populate("parts.part_id")
      .lean();

    // Reload appointment để có thông tin final_cost và status
    const updatedAppointment = await Appointment.findById(appointment._id)
      .select("_id status final_cost")
      .lean();

    const message = hasParts
      ? "Checklist đã được chấp nhận, đã báo giá"
      : "Checklist đã được chấp nhận, đã chuyển sang in_progress (không có phụ tùng)";

    return res.status(200).json({
      message,
      success: true,
      data: {
        checklist: updatedChecklist,
        totalCost,
        appointment: {
          _id: updatedAppointment._id,
          status: updatedAppointment.status, // "in_progress" nếu không có parts, "check_in" nếu có parts
          final_cost: updatedAppointment.final_cost,
        },
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

// Staff cancel checklist
exports.cancelChecklist = async (req, res) => {
  try {
    const staff_id = req._id?.toString();
    const { checklistId } = req.params;
    const { note } = req.body;

    if (!staff_id) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Kiểm tra role staff
    const user = await User.findById(staff_id);
    if (!["admin", "staff"].includes(user?.role)) {
      return res.status(403).json({
        message: "Access denied. Staff role required",
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

    // Chỉ có thể cancel checklist có status pending hoặc accepted
    if (!["pending", "accepted"].includes(checklist.status)) {
      return res.status(400).json({
        message:
          "Chỉ có thể hủy checklist có trạng thái 'pending' hoặc 'accepted'",
        success: false,
      });
    }

    // Cập nhật checklist
    checklist.status = "canceled";
    if (note) {
      checklist.cancellation_note = note;
    }
    await checklist.save();

    // Populate và trả về thông tin checklist đã được cancel
    await checklist.populate([
      { path: "issue_type_id" },
      { path: "appointment_id" },
      { path: "parts.part_id" },
    ]);

    return res.status(200).json({
      message: "Checklist đã được hủy",
      success: true,
      data: checklist,
    });
  } catch (error) {
    console.error("Cancel checklist error:", error);
    return res.status(500).json({
      message: "Lỗi hủy checklist",
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

    // Emit socket event on status change -> completed
    try {
      const io = req.app.get("io");
      if (io) {
        const appt = checklist.appointment_id;
        const customerRoom = appt?.user_id?.toString();
        const technicianRoom = appt?.technician_id?.toString();
        const payload = {
          appointment_id: appt?._id,
          status: "completed",
        };
        if (customerRoom)
          io.to(customerRoom).emit("appointment_updated", payload);
        if (technicianRoom)
          io.to(technicianRoom).emit("appointment_updated", payload);
      }
    } catch (e) {
      console.error("Socket emit error (completeChecklist):", e?.message || e);
    }

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
