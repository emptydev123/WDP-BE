const Appointment = require("../model/appointment");
const User = require("../model/user");
const ServiceCenter = require("../model/serviceCenter");
const Vehicle = require("../model/vehicle");
const AssignSchedule = require("../model/assignSchedule");
const {
  createPagination,
  createAppointmentResponse,
  validatePagination,
} = require("../utils/pagination");

exports.getAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, service_center_id } = req.query;
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
    if (status) {
      query.status = status;
    }
    if (service_center_id) {
      query.center_id = service_center_id;
    }

    const total = await Appointment.countDocuments(query);

    const pagination = createPagination(validatedPage, validatedLimit, total);

    const appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate({
        path: "assigned_schedule_id",
        populate: [
          {
            path: "user_id",
            select: "username fullName email phone role",
          },
          {
            path: "assigned_by",
            select: "username fullName email",
          },
        ],
      })
      .sort({ appoinment_date: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createAppointmentResponse(appointments, pagination);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get appointments error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách appointment",
      error: error.message,
      success: false,
    });
  }
};

exports.assignTechnician = async (req, res) => {
  try {
    const { appointment_id, technician_id, time_start, time_end } = req.body;
    const assignedBy = req._id?.toString();

    if (!assignedBy) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!appointment_id || !technician_id || !time_start || !time_end) {
      return res.status(400).json({
        message:
          "Thiếu appointment_id, technician_id, time_start hoặc time_end",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointment_id);
    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    if (appointment.assigned_schedule_id) {
      return res.status(400).json({
        message: "Appointment đã được assign cho technician khác",
        success: false,
      });
    }

    const technician = await User.findById(technician_id);
    if (!technician || technician.role !== "technician") {
      return res.status(400).json({
        message: "Technician không tồn tại hoặc không có quyền",
        success: false,
      });
    }

    const newAssignSchedule = new AssignSchedule({
      user_id: technician_id,
      appointment_id: appointment_id,
      time_start: time_start,
      time_end: time_end,
      assigned_by: assignedBy,
      status: "active",
    });

    const savedAssignSchedule = await newAssignSchedule.save();

    appointment.assigned_schedule_id = savedAssignSchedule._id;
    appointment.status = "accept";
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment_id)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate({
        path: "assigned_schedule_id",
        populate: [
          {
            path: "user_id",
            select: "username fullName email phone role",
          },
          {
            path: "assigned_by",
            select: "username fullName email",
          },
        ],
      })
      .lean();

    return res.status(200).json({
      message: "Assign technician thành công",
      success: true,
      data: updatedAppointment,
    });
  } catch (error) {
    console.error("Assign technician error:", error);
    return res.status(500).json({
      message: "Lỗi assign technician",
      error: error.message,
      success: false,
    });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { appointment_id, status } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!appointment_id || !status) {
      return res.status(400).json({
        message: "Thiếu appointment_id hoặc status",
        success: false,
      });
    }

    const validStatuses = ["pending", "accept", "completed", "canceled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Status không hợp lệ. Chỉ chấp nhận: pending, accept, completed, canceled",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointment_id);
    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    appointment.status = status;
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment_id)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .lean();

    return res.status(200).json({
      message: "Cập nhật trạng thái appointment thành công",
      success: true,
      data: updatedAppointment,
    });
  } catch (error) {
    console.error("Update appointment status error:", error);
    return res.status(500).json({
      message: "Lỗi cập nhật trạng thái appointment",
      error: error.message,
      success: false,
    });
  }
};

exports.updateServiceRecord = async (req, res) => {
  try {
    const { appointment_id, service_record } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!appointment_id || !service_record) {
      return res.status(400).json({
        message: "Thiếu appointment_id hoặc service_record",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointment_id);
    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    appointment.notes = service_record.technician_notes || appointment.notes;
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment_id)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .lean();

    return res.status(200).json({
      message: "Cập nhật phiếu tiếp nhận dịch vụ thành công",
      success: true,
      data: updatedAppointment,
    });
  } catch (error) {
    console.error("Update service record error:", error);
    return res.status(500).json({
      message: "Lỗi cập nhật phiếu tiếp nhận dịch vụ",
      error: error.message,
      success: false,
    });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate("user_id", "username fullName email phone address")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year color")
      .populate({
        path: "assigned_schedule_id",
        populate: [
          {
            path: "user_id",
            select: "username fullName email phone role",
          },
          {
            path: "assigned_by",
            select: "username fullName email",
          },
        ],
      })
      .lean();

    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin appointment thành công",
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Get appointment by ID error:", error);
    return res.status(500).json({
      message: "Lỗi lấy thông tin appointment",
      error: error.message,
      success: false,
    });
  }
};

exports.getAppointmentsByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy user",
        success: false,
      });
    }

    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );

    const query = { user_id: user._id };
    if (status) {
      query.status = status;
    }

    const total = await Appointment.countDocuments(query);

    const pagination = createPagination(validatedPage, validatedLimit, total);

    const appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate({
        path: "assigned_schedule_id",
        populate: [
          {
            path: "user_id",
            select: "username fullName email phone role",
          },
          {
            path: "assigned_by",
            select: "username fullName email",
          },
        ],
      })
      .sort({ appoinment_date: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createAppointmentResponse(
      appointments,
      pagination,
      "Lấy danh sách appointment theo username thành công"
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get appointments by username error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách appointment theo username",
      error: error.message,
      success: false,
    });
  }
};
