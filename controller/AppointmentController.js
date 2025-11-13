const Appointment = require("../model/appointment");
const User = require("../model/user");
const ServiceCenter = require("../model/serviceCenter");
const Vehicle = require("../model/vehicle");
const Payment = require("../model/payment");
const PaymentController = require("./PaymentController");
const ServiceType = require("../model/serviceType");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");
const {
  buildLocalDateTime,
  parseDurationToMs,
  timeToMinutes,
  calculateEndTime,
  checkTimeOverlap,
  addBufferToTime,
  getCurrentTime,
  isPastDate,
  calculateTimeoutAt,
} = require("../utils/timeUtils");
const { PAYMENT_EXPIRED_TIME, DEPOSIT_COST } = require("../utils/constants");
var Technican = require("../model/technican");
const { getDayOfWeek } = require("../utils/logicSlots");
var ServiceCenterHours = require("../model/serviceCenterHours");
const { checkAndUpdateSlotsForNextWeek } = require("../utils/logicSlots");
const { createAppointmentReminder } = require("../utils/reminder");
exports.getAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      service_center_id,
      technician_id,
      customer_id,
      is_working_now,
      date,
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

    const query = {};

    if (status) {
      // Validate status theo enum trong model
      const validStatuses = [
        "pending",
        "assigned",
        "check_in",
        "in_progress",
        "repaired",
        "completed",
        "canceled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Status không hợp lệ. Chỉ chấp nhận: pending, assigned, check_in, in_progress, repaired, completed, canceled",
          success: false,
        });
      }
      query.status = status;
    }
    if (service_center_id) {
      query.center_id = service_center_id;
    }
    if (technician_id) {
      query.technician_id = technician_id;
    }
    if (customer_id) {
      query.user_id = customer_id;
    }

    if (is_working_now === "true") {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      query.appoinment_date = {
        $gte: startOfToday,
        $lte: endOfToday,
      };
      query.status = { $in: ["in_progress", "assigned", "check_in"] };
      query.technician_id = { $ne: null };
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.appoinment_date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    if (date_from || date_to) {
      query.appoinment_date = {};

      if (date_from) {
        const fromDate = new Date(date_from);
        fromDate.setHours(0, 0, 0, 0);
        query.appoinment_date.$gte = fromDate;
      }

      if (date_to) {
        const toDate = new Date(date_to);
        toDate.setHours(23, 59, 59, 999);
        query.appoinment_date.$lte = toDate;
      }
    }

    const total = await Appointment.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    let appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phoneNumber")
      .populate("center_id", "center_name address phone")
      .populate("vehicle_id", "license_plate vin")
      .populate("staff_id", "username fullName email phoneNumber role")
      .populate("technician_id", "username fullName email phoneNumber role")
      .populate(
        "payment_id",
        "order_code orderCode amount status checkout_url checkoutUrl qr_code qrCode timeoutAt"
      )
      .populate(
        "final_payment_id",
        "orderCode amount status checkoutUrl qrCode timeoutAt"
      )
      .populate(
        "service_type_id",
        "service_name description base_price estimated_duration"
      )
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    if (is_working_now === "true") {
      const currentTime = getCurrentTime();
      const currentTimeMinutes = timeToMinutes(currentTime);

      appointments = appointments.filter((appt) => {
        if (!appt.estimated_end_time) return false;

        const startMinutes = timeToMinutes(appt.appoinment_time);
        const endMinutes = timeToMinutes(appt.estimated_end_time);

        return (
          currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes
        );
      });
    }

    const response = createPaginatedResponse(
      appointments,
      pagination,
      "Lấy danh sách appointments thành công"
    );
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

exports.getTechnicianSchedule = async (req, res) => {
  try {
    const {
      technician_id,
      date_from,
      date_to,
      page = 1,
      limit = 10,
    } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Kiểm tra tham số bắt buộc
    if (!date_from || !date_to) {
      return res.status(400).json({
        message: "Thiếu date_from hoặc date_to",
        success: false,
      });
    }

    // Xác thực khoảng thời gian
    const fromDate = new Date(date_from);
    const toDate = new Date(date_to);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    if (fromDate > toDate) {
      return res.status(400).json({
        message: "date_from không được lớn hơn date_to",
        success: false,
      });
    }

    // Nếu có technician_id - lấy chi tiết lịch của technician cụ thể
    if (technician_id) {
      const technician = await User.findById(technician_id);
      if (!technician || technician.role !== "technician") {
        return res.status(404).json({
          message: "Technician không tồn tại",
          success: false,
        });
      }

      const schedules = await Appointment.find({
        technician_id: technician_id,
        appoinment_date: {
          $gte: fromDate,
          $lte: toDate,
        },
        status: {
          $in: ["assigned", "check_in", "in_progress", "repaired", "completed"],
        },
      })
        .populate("user_id", "fullName phoneNumber")
        .populate("vehicle_id", "license_plate brand model")
        .populate("center_id", "center_name address")
        .populate("service_type_id", "service_name estimated_duration")
        .select(
          "appoinment_date appoinment_time estimated_end_time status notes deposit_cost final_cost"
        )
        .sort({ appoinment_date: 1, appoinment_time: 1 })
        .lean();

      return res.status(200).json({
        message: "Lấy lịch làm việc của technician thành công",
        success: true,
        data: {
          technician: {
            _id: technician._id,
            fullName: technician.fullName,
            email: technician.email,
            phoneNumber: technician.phoneNumber,
          },
          date_range: {
            from: date_from,
            to: date_to,
          },
          schedules,
          total_assignments: schedules.length,
        },
      });
    }

    // Nếu không có technician_id - lấy danh sách tất cả technician
    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );

    // Lấy danh sách tất cả technician
    const totalTechnicians = await User.countDocuments({ role: "technician" });
    const pagination = createPagination(
      validatedPage,
      validatedLimit,
      totalTechnicians
    );

    const technicians = await User.find({ role: "technician" })
      .select("_id fullName email phoneNumber")
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    // Lấy lịch làm việc cho từng technician
    const techniciansWithSchedules = await Promise.all(
      technicians.map(async (technician) => {
        const schedules = await Appointment.find({
          technician_id: technician._id,
          appoinment_date: {
            $gte: fromDate,
            $lte: toDate,
          },
          status: {
            $in: [
              "assigned",
              "check_in",
              "in_progress",
              "repaired",
              "completed",
            ],
          },
        })
          .populate("user_id", "fullName phoneNumber")
          .populate("vehicle_id", "license_plate brand model")
          .populate("center_id", "center_name address")
          .populate("service_type_id", "service_name estimated_duration")
          .select(
            "appoinment_date appoinment_time estimated_end_time status notes estimated_cost"
          )
          .sort({ appoinment_date: 1, appoinment_time: 1 })
          .lean();

        return {
          technician,
          schedules,
          total_assignments: schedules.length,
        };
      })
    );

    const response = createPaginatedResponse(
      techniciansWithSchedules,
      pagination,
      "Lấy danh sách lịch làm việc của tất cả technician thành công"
    );

    // Thêm thông tin khoảng thời gian vào response
    response.data.date_range = {
      from: date_from,
      to: date_to,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get technician schedule error:", error);
    return res.status(500).json({
      message: "Lỗi lấy lịch làm việc",
      error: error.message,
      success: false,
    });
  }
};

exports.assignTechnician = async (req, res) => {
  try {
    const { appointment_id, technician_id } = req.body;
    const staffId = req._id?.toString();

    if (!staffId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!appointment_id || !technician_id) {
      return res.status(400).json({
        message: "Thiếu appointment_id hoặc technician_id",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointment_id).populate(
      "service_type_id"
    );
    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    if (appointment.technician_id) {
      return res.status(400).json({
        message: "Appointment đã được assign cho technician khác",
        success: false,
      });
    }

    // const technician = await User.findById(technician_id);
    // if (!technician || technician.role !== "technical") {
    //   return res.status(400).json({
    //     message: "Technician không tồn tại hoặc không có quyền",
    //     success: false,
    //   });
    // }

    const technicianAppointments = await Appointment.find({
      technician_id: technician_id,
      status: "in_progress",
      estimated_end_time: { $ne: null },
      _id: { $ne: appointment_id },
    }).lean();

    const BUFFER_HOURS = 1;
    const newAppointmentTimeMinutes = timeToMinutes(
      appointment.appoinment_time
    );

    for (const existingAppt of technicianAppointments) {
      const endTimeWithBuffer = addBufferToTime(
        existingAppt.estimated_end_time,
        BUFFER_HOURS
      );
      const endTimeWithBufferMinutes = timeToMinutes(endTimeWithBuffer);

      if (newAppointmentTimeMinutes < endTimeWithBufferMinutes) {
        return res.status(400).json({
          message: `Technician đang bận đến ${endTimeWithBuffer} (bao gồm buffer 1 tiếng)`,
          success: false,
          conflict: {
            appointment_id: existingAppt._id,
            estimated_end_time: existingAppt.estimated_end_time,
            time_end_with_buffer: endTimeWithBuffer,
          },
        });
      }
    }

    appointment.staff_id = staffId;
    appointment.technician_id = technician_id;
    appointment.status = "assigned";
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment_id)
      .populate("user_id", "username fullName email phoneNumber")
      .populate("center_id", "center_name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate("staff_id", "username fullName email phoneNumber role")
      .populate("technician_id", "username fullName email phoneNumber role")
      .populate(
        "payment_id",
        "order_code orderCode amount status checkout_url checkoutUrl qr_code qrCode"
      )
      .populate(
        "final_payment_id",
        "orderCode amount status checkoutUrl qrCode"
      )
      .populate(
        "service_type_id",
        "service_name description base_price estimated_duration"
      )
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

exports.getMyAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
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

    const query = { user_id: userId };
    if (status) {
      // Validate status theo enum trong model
      const validStatuses = [
        "pending",
        "assigned",
        "check_in",
        "in_progress",
        "repaired",
        "completed",
        "canceled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Status không hợp lệ. Chỉ chấp nhận: pending, assigned, check_in, in_progress, repaired, completed, canceled",
          success: false,
        });
      }
      query.status = status;
    }

    const total = await Appointment.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phoneNumber")
      .populate("center_id", "center_name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate("staff_id", "username fullName email phoneNumber role")
      .populate("technician_id", "username fullName email phoneNumber role")
      .populate(
        "payment_id",
        "order_code orderCode amount status checkout_url checkoutUrl qr_code qrCode timeoutAt"
      )
      .populate(
        "final_payment_id",
        "orderCode amount status checkoutUrl qrCode timeoutAt"
      )
      .populate(
        "service_type_id",
        "service_name description base_price estimated_duration"
      )
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      appointments,
      pagination,
      "Lấy danh sách appointments của tôi thành công"
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get my appointments error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách appointments",
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

    const validStatuses = [
      "pending",
      "assigned",
      "check_in",
      "in_progress",
      "repaired",
      "completed",
      "delay",
      "canceled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Status không hợp lệ. Chỉ chấp nhận: pending, assigned, check_in, in_progress, repaired, completed, delay, canceled",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointment_id)
      .populate("payment_id")
      .populate("service_type_id");

    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    const oldStatus = appointment.status;
    appointment.status = status;

    if (status === "in_progress" && oldStatus !== "in_progress") {
      const estimatedDuration = appointment.service_type_id?.estimated_duration;

      if (estimatedDuration) {
        const actualStartTime = getCurrentTime();

        appointment.appoinment_time = actualStartTime;

        const durationHours = parseFloat(estimatedDuration);
        const estimatedEndTime = calculateEndTime(
          actualStartTime,
          durationHours
        );

        appointment.estimated_end_time = estimatedEndTime;
      }
    }

    // deposit_cost và final_cost được quản lý khi tạo appointment và accept checklist

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment_id)
      .populate("user_id", "username fullName email phoneNumber")
      .populate("center_id", "center_name address phone")
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
      .populate("user_id", "username fullName email phoneNumber address")
      .populate("center_id", "center_name address phone")
      .populate("vehicle_id", "license_plate brand model year color")
      .populate("staff_id", "username fullName email phoneNumber role")
      .populate("technician_id", "username fullName email phoneNumber role")
      .populate(
        "payment_id",
        "order_code orderCode amount status checkout_url checkoutUrl qr_code qrCode timeoutAt"
      )
      .populate(
        "final_payment_id",
        "orderCode amount status checkoutUrl qrCode timeoutAt"
      )
      .populate(
        "service_type_id",
        "service_name description base_price estimated_duration"
      )
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
      // Validate status theo enum trong model
      const validStatuses = [
        "pending",
        "assigned",
        "check_in",
        "in_progress",
        "repaired",
        "completed",
        "canceled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Status không hợp lệ. Chỉ chấp nhận: pending, assigned, check_in, in_progress, repaired, completed, canceled",
          success: false,
        });
      }
      query.status = status;
    }

    const total = await Appointment.countDocuments(query);

    const pagination = createPagination(validatedPage, validatedLimit, total);

    const appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phoneNumber")
      .populate("center_id", "center_name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate("staff_id", "username fullName email phoneNumber role")
      .populate("technician_id", "username fullName email phoneNumber role")
      .populate(
        "payment_id",
        "order_code orderCode amount status checkout_url checkoutUrl qr_code qrCode"
      )
      .populate(
        "final_payment_id",
        "orderCode amount status checkoutUrl qrCode"
      )
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
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

exports.getAppointmentsByTechnician = async (req, res) => {
  try {
    const { technicianId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!technicianId) {
      return res.status(400).json({
        message: "Thiếu technician ID",
        success: false,
      });
    }

    const technician = await User.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        message: "Không tìm thấy technician",
        success: false,
      });
    }

    const { page: validatedPage, limit: validatedLimit } = validatePagination(
      page,
      limit
    );

    const query = { technician_id: technicianId };
    if (status) {
      // Validate status theo enum trong model
      const validStatuses = [
        "pending",
        "assigned",
        "check_in",
        "in_progress",
        "repaired",
        "completed",
        "canceled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Status không hợp lệ. Chỉ chấp nhận: pending, assigned, check_in, in_progress, repaired, completed, canceled",
          success: false,
        });
      }
      query.status = status;
    }

    const total = await Appointment.countDocuments(query);

    const pagination = createPagination(validatedPage, validatedLimit, total);

    const appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phoneNumber")
      .populate("center_id", "center_name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate("staff_id", "username fullName email phoneNumber role")
      .populate("technician_id", "username fullName email phoneNumber role")
      .populate(
        "payment_id",
        "order_code orderCode amount status checkout_url checkoutUrl qr_code qrCode"
      )
      .populate(
        "final_payment_id",
        "orderCode amount status checkoutUrl qrCode"
      )
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      appointments,
      pagination,
      "Lấy danh sách appointment theo technician thành công"
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get appointments by technician error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách appointment theo technician",
      error: error.message,
      success: false,
    });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!appointmentId) {
      return res.status(400).json({
        message: "Thiếu appointment ID",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        message: "Chỉ có thể xóa appointment có trạng thái pending",
        success: false,
      });
    }

    await Appointment.findByIdAndDelete(appointmentId);

    return res.status(200).json({
      message: "Xóa appointment thành công",
      success: true,
    });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return res.status(500).json({
      message: "Lỗi xóa appointment",
      error: error.message,
      success: false,
    });
  }
};
exports.createFinalPayment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!appointmentId) {
      return res.status(400).json({
        message: "Thiếu appointment ID",
        success: false,
      });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate("payment_id")
      .populate("user_id", "username fullName email phoneNumber");

    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    if (appointment.status !== "repaired") {
      return res.status(400).json({
        message:
          "Chỉ có thể tạo final payment cho appointment đã sửa chữa xong",
        success: false,
      });
    }

    if (appointment.final_payment_id) {
      return res.status(400).json({
        message: "Appointment đã có final payment",
        success: false,
      });
    }

    const remainingAmount = appointment.final_cost || 0;

    if (remainingAmount <= 0) {
      return res.status(400).json({
        message: "Không cần thanh toán thêm (đã thanh toán đủ)",
        success: false,
      });
    }

    const finalPaymentDescription = `Thanh toan con lai ${appointment._id
      .toString()
      .slice(-6)}`;

    const paymentReq = {
      _id: appointment.user_id._id.toString(),
      body: {
        amount: remainingAmount,
        description: finalPaymentDescription,
      },
    };

    let paymentResult = null;
    const paymentRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 201) {
            paymentResult = data;
          }
        },
      }),
    };

    try {
      await PaymentController.createPaymentLink(paymentReq, paymentRes);
    } catch (paymentError) {
      const orderCode = Date.now();
      const fallbackPayment = new Payment({
        orderCode: orderCode,
        amount: remainingAmount,
        description: finalPaymentDescription,
        status: "PENDING",
        user_id: appointment.user_id._id,
        timeoutAt: calculateTimeoutAt(PAYMENT_EXPIRED_TIME),
      });

      await fallbackPayment.save();
      paymentResult = {
        success: true,
        data: {
          payment_id: fallbackPayment._id,
          orderCode: orderCode,
          amount: remainingAmount,
          status: "PENDING",
        },
      };
    }

    if (paymentResult && paymentResult.success) {
      appointment.final_payment_id = paymentResult.data.payment_id;
      await appointment.save();

      const populatedAppointment = await Appointment.findById(appointmentId)
        .populate("user_id", "username fullName email phoneNumber")
        .populate("center_id", "center_name address phone")
        .populate("vehicle_id", "license_plate brand model year")

        .populate(
          "payment_id",
          "order_code orderCode amount status checkout_url checkoutUrl qr_code qrCode"
        )
        .populate(
          "final_payment_id",
          "orderCode amount status checkoutUrl qrCode"
        );

      return res.status(200).json({
        message: "Cập nhật appointment với final payment thành công",
        success: true,
        data: populatedAppointment,
      });
    } else {
      return res.status(500).json({
        message: "Lỗi tạo final payment",
        success: false,
      });
    }
  } catch (error) {
    console.error("Create final payment error:", error);
    return res.status(500).json({
      message: "Lỗi tạo final payment",
      error: error.message,
      success: false,
    });
  }
};
exports.validateAppointmentRules = async ({
  appoinment_date,
  appoinment_time,
  center_id,
  vehicle_id,
  service_type_id,
  serviceType,
  existingAppointments,
}) => {
  // Helper to safely extract id string from populated or ObjectId/null
  const getIdString = (ref) => {
    if (!ref) return null;
    if (typeof ref === "string") return ref;
    if (ref._id) return ref._id.toString();
    if (typeof ref.toString === "function") return ref.toString();
    return null;
  };
  const getDateOnlyString = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString().split("T")[0];
    // if stored as string 'YYYY-MM-DD'
    if (typeof d === "string") return d.split("T")[0];
    return null;
  };

  const BUFFER_MS = 5 * 60 * 1000;
  const newStart = buildLocalDateTime(appoinment_date, appoinment_time);
  const newEnd = new Date(
    newStart.getTime() +
    parseDurationToMs(serviceType.estimated_duration) +
    BUFFER_MS
  );

  const activeStatuses = ["pending", "in_progress"];
  const finishedStatuses = ["completed", "cancelled"];

  // Check trùng hoàn toàn
  const exactSame = existingAppointments.find(
    (a) =>
      getIdString(a?.center_id) === center_id &&
      getIdString(a?.vehicle_id) === vehicle_id &&
      getIdString(a?.service_type_id) === service_type_id &&
      getDateOnlyString(a?.appoinment_date) === appoinment_date &&
      a?.appoinment_time === appoinment_time &&
      !finishedStatuses.includes(a?.status)
  );
  if (exactSame) {
    return "Đã tồn tại lịch hẹn trùng hoàn toàn (trung tâm, xe, dịch vụ, ngày, giờ).";
  }

  const sameCombo = existingAppointments.filter(
    (a) =>
      getIdString(a?.center_id) === center_id &&
      getIdString(a?.vehicle_id) === vehicle_id &&
      getIdString(a?.service_type_id) === service_type_id &&
      getDateOnlyString(a?.appoinment_date) === appoinment_date &&
      activeStatuses.includes(a?.status)
  );
  if (sameCombo.length >= 2) {
    return "Bạn chỉ có thể tạo tối đa 2 lịch đang hoạt động (pending/in_progress) cho cùng trung tâm, xe và dịch vụ.";
  }

  const sameTimeConflict = existingAppointments.find(
    (a) =>
      getDateOnlyString(a?.appoinment_date) === appoinment_date &&
      a?.appoinment_time === appoinment_time &&
      getIdString(a?.vehicle_id) === vehicle_id &&
      getIdString(a?.center_id) !== null &&
      getIdString(a?.center_id) !== center_id &&
      !finishedStatuses.includes(a?.status)
  );
  if (sameTimeConflict) {
    return "Xe này đã có lịch ở trung tâm khác tại cùng thời điểm.";
  }

  const overlapAppointment = existingAppointments.find((a) => {
    if (getIdString(a?.vehicle_id) !== vehicle_id) return false;

    const existingDateStr = getDateOnlyString(a?.appoinment_date);
    if (existingDateStr !== appoinment_date) return false;

    const existingDurationStr =
      (a?.service_type_id && a.service_type_id?.estimated_duration) ||
      a?.estimated_duration ||
      "0";

    const existingStart = buildLocalDateTime(
      existingDateStr,
      a?.appoinment_time
    );
    const existingEnd = new Date(
      existingStart.getTime() +
      parseDurationToMs(existingDurationStr) +
      BUFFER_MS
    );

    const overlap =
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd);

    return overlap && !finishedStatuses.includes(a?.status);
  });
  if (overlapAppointment)
    return "Xe này đã có lịch trong khoảng thời gian này (bao gồm thời lượng dịch vụ).";

  return null;
};
/**
 * Tự động assign technician cho appointment
 * Logic: Tìm technician có slot còn lại trong ngày và không bận vào thời gian đó
 */
exports.autoAssignTechnician = async ({
  center_id,
  appoinment_date,
  appoinment_time,
  serviceType,
  excludeTechnicianId = null, // Nếu đã có technician được chỉ định thì không assign lại
}) => {
  try {
    // Lấy tất cả technicians của center này (status = 'on')
    const technicians = await Technican.find({
      center_id,
      status: "on",
    }).populate("user_id");

    if (!technicians || technicians.length === 0) {
      return null; // Không có technician nào
    }

    // Chuyển đổi appointment_date sang Date object để so sánh
    const appointmentDate = new Date(appoinment_date);
    appointmentDate.setHours(0, 0, 0, 0);
    const appointmentDateEnd = new Date(appoinment_date);
    appointmentDateEnd.setHours(23, 59, 59, 999);

    // Lọc technicians có thể làm việc
    const availableTechnicians = [];

    for (const tech of technicians) {
      const techUserId = tech.user_id._id.toString();

      // Bỏ qua technician nếu bị exclude
      if (
        excludeTechnicianId &&
        techUserId === excludeTechnicianId.toString()
      ) {
        continue;
      }

      // 1. Kiểm tra technician đã đủ 4 slot trong ngày chưa
      const appointmentsInDay = await Appointment.countDocuments({
        technician_id: techUserId,
        appoinment_date: {
          $gte: appointmentDate,
          $lte: appointmentDateEnd,
        },
        status: {
          $in: ["pending", "assigned", "check_in", "in_progress"],
        },
      });

      // Mỗi technician chỉ làm tối đa 4 slot/ngày
      if (appointmentsInDay >= 4) {
        continue; // Technician này đã full slot
      }

      // 2. Kiểm tra technician có bận vào thời gian này không
      const conflictingAppointments = await Appointment.find({
        technician_id: techUserId,
        appoinment_date: {
          $gte: appointmentDate,
          $lte: appointmentDateEnd,
        },
        status: {
          $in: ["pending", "assigned", "check_in", "in_progress"],
        },
      })
        .populate("service_type_id")
        .lean();

      // Kiểm tra overlap thời gian
      let hasConflict = false;

      const newStart = buildLocalDateTime(appoinment_date, appoinment_time);
      const newEnd = new Date(
        newStart.getTime() +
        parseDurationToMs(serviceType.estimated_duration)
      );

      for (const existingAppt of conflictingAppointments) {
        if (!existingAppt.appoinment_time || !existingAppt.service_type_id) {
          continue;
        }

        const existingDateStr = existingAppt.appoinment_date
          .toISOString()
          .split("T")[0];
        const existingStart = buildLocalDateTime(
          existingDateStr,
          existingAppt.appoinment_time
        );

        const existingDurationStr =
          existingAppt.service_type_id?.estimated_duration ||
          existingAppt.estimated_duration ||
          "0";

        // Tính thời gian kết thúc của lịch cũ (không cộng buffer để cho phép đặt lịch tiếp theo ngay)
        const existingEnd = new Date(
          existingStart.getTime() +
          parseDurationToMs(existingDurationStr)
        );

        // Overlap nếu: lịch mới bắt đầu trước khi lịch cũ kết thúc HOẶC lịch mới kết thúc sau khi lịch cũ bắt đầu
        // Cho phép đặt lịch mới ngay khi lịch cũ kết thúc (newStart >= existingEnd)
        const overlap =
          (newStart < existingEnd && newEnd > existingStart);

        if (overlap) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        // Technician này available
        availableTechnicians.push({
          technician: tech,
          currentAppointments: appointmentsInDay,
        });
      }
    }

    // Nếu không có technician nào available
    if (availableTechnicians.length === 0) {
      return null;
    }

    // Nếu chỉ có 1 technician available, chọn người đó
    if (availableTechnicians.length === 1) {
      return availableTechnicians[0].technician.user_id._id.toString();
    }

    // Nếu có nhiều technicians, ưu tiên người có ít appointments nhất (công bằng)
    // Nếu bằng nhau thì random
    availableTechnicians.sort(
      (a, b) => a.currentAppointments - b.currentAppointments
    );

    // Lấy các technicians có số appointments ít nhất
    const minAppointments = availableTechnicians[0].currentAppointments;
    const topTechnicians = availableTechnicians.filter(
      (t) => t.currentAppointments === minAppointments
    );

    // Random trong số những người có appointments ít nhất
    const randomIndex = Math.floor(Math.random() * topTechnicians.length);
    return topTechnicians[randomIndex].technician.user_id._id.toString();
  } catch (error) {
    console.error("Auto assign technician error:", error);
    return null;
  }
};

exports.createDepositPayment = async (userId, appointmentId) => {
  const depositAmount = DEPOSIT_COST;
  const description = `Tam ung ${appointmentId.toString().slice(-6)}`;

  let paymentResult = null;
  const paymentReq = {
    _id: userId,
    body: {
      amount: depositAmount,
      description,
      timeoutSeconds: PAYMENT_EXPIRED_TIME, // Truyền timeout từ constant (60 giây)
    },
  };
  const paymentRes = {
    status: (code) => ({
      json: (data) => {
        if (code === 201) paymentResult = data;
      },
    }),
  };

  try {
    await PaymentController.createPaymentLink(paymentReq, paymentRes);
  } catch {
    const orderCode = Date.now();
    const fallback = new Payment({
      orderCode: orderCode,
      amount: depositAmount,
      description,
      status: "PENDING",
      user_id: userId,
      timeoutAt: calculateTimeoutAt(PAYMENT_EXPIRED_TIME), // Default 15 phút cho fallback
    });
    await fallback.save();
    paymentResult = {
      success: true,
      data: {
        payment_id: fallback._id,
        orderCode: orderCode,
        amount: depositAmount,
      },
    };
  }
  return paymentResult;
};

exports.createAppointment = async (req, res) => {
  try {
    const {
      appoinment_date,
      appoinment_time,
      notes,
      user_id,
      vehicle_id,
      center_id,
      service_type_id,
      technician_id,
    } = req.body;
    const userId = req._id?.toString();

    if (!userId)
      return res.status(401).json({ message: "Unauthorized", success: false });

    //  Kiểm tra thông tin cơ bản
    const [user, vehicle, serviceCenter, serviceType] = await Promise.all([
      User.findById(user_id),
      Vehicle.findById(vehicle_id),
      ServiceCenter.findById(center_id),
      ServiceType.findById(service_type_id),
    ]);

    if (!user || !vehicle || !serviceCenter || !serviceType)
      return res
        .status(404)
        .json({ message: "Thông tin không hợp lệ", success: false });

    //  Reset slot nếu người dùng đặt cho tuần sau mà cron chưa reset
    await checkAndUpdateSlotsForNextWeek(appoinment_date, center_id);

    //  Kiểm tra số lượng slot còn lại trong ngày cho center
    const serviceCenterHours = await ServiceCenterHours.findOne({
      center_id,
      day_of_week: getDayOfWeek(appoinment_date),
    });

    if (!serviceCenterHours) {
      return res.status(400).json({
        message: "Không tìm thấy thông tin giờ làm việc cho trung tâm này",
        success: false,
      });
    }

    //  Kiểm tra còn slot không
    if (serviceCenterHours.remainingSlots <= 0) {
      return res.status(400).json({
        message: "Không còn slot trống cho ngày này. Vui lòng chọn ngày khác.",
      });
    }

    //  Kiểm tra quy tắc đặt lịch khác (nếu có)
    const existingAppointments = await Appointment.find({
      user_id,
      status: {
        $in: [
          "pending",
          "assigned",
          "check_in",
          "in_progress",
          "repaired",
          "completed",
        ],
      },
    }).populate("service_type_id center_id vehicle_id");

    const ruleError = await exports.validateAppointmentRules({
      appoinment_date,
      appoinment_time,
      center_id,
      vehicle_id,
      service_type_id,
      serviceType,
      existingAppointments,
    });

    if (ruleError)
      return res.status(400).json({ message: ruleError, success: false });

    // Đánh dấu có lịch đặt và trừ slot 1 lần duy nhất
    serviceCenterHours.isBooked = true;
    serviceCenterHours.remainingSlots -= 1;
    await serviceCenterHours.save();

    // Xử lý technician assignment
    let selectedTechnician = null;

    // Nếu khách chọn technician cụ thể
    if (technician_id && technician_id.trim() !== "") {
      selectedTechnician = technician_id;

      // Kiểm tra technician có tồn tại và thuộc center này không
      const techRecord = await Technican.findOne({
        user_id: technician_id,
        center_id: center_id,
        status: "on",
      });

      if (!techRecord) {
        return res.status(400).json({
          message: "Technician không tồn tại hoặc không thuộc trung tâm này",
          success: false,
        });
      }

      // Kiểm tra technician có còn slot và không bận không
      const appointmentDate = new Date(appoinment_date);
      appointmentDate.setHours(0, 0, 0, 0);
      const appointmentDateEnd = new Date(appoinment_date);
      appointmentDateEnd.setHours(23, 59, 59, 999);

      const appointmentsInDay = await Appointment.countDocuments({
        technician_id: technician_id,
        appoinment_date: {
          $gte: appointmentDate,
          $lte: appointmentDateEnd,
        },
        status: {
          $in: ["pending", "assigned", "check_in", "in_progress"],
        },
      });

      if (appointmentsInDay >= 4) {
        return res.status(400).json({
          message:
            "Technician đã đủ 4 slot trong ngày. Vui lòng chọn technician khác hoặc để hệ thống tự động phân công.",
          success: false,
        });
      }

      // Kiểm tra conflict thời gian
      const conflictingAppointments = await Appointment.find({
        technician_id: technician_id,
        appoinment_date: {
          $gte: appointmentDate,
          $lte: appointmentDateEnd,
        },
        status: {
          $in: ["pending", "assigned", "check_in", "in_progress"],
        },
      })
        .populate("service_type_id")
        .lean();

      const newStart = buildLocalDateTime(appoinment_date, appoinment_time);
      const newEnd = new Date(
        newStart.getTime() +
        parseDurationToMs(serviceType.estimated_duration)
      );

      for (const existingAppt of conflictingAppointments) {
        if (!existingAppt.appoinment_time || !existingAppt.service_type_id) {
          continue;
        }

        const existingDateStr = existingAppt.appoinment_date
          .toISOString()
          .split("T")[0];
        const existingStart = buildLocalDateTime(
          existingDateStr,
          existingAppt.appoinment_time
        );

        const existingDurationStr =
          existingAppt.service_type_id?.estimated_duration ||
          existingAppt.estimated_duration ||
          "0";

        // Tính thời gian kết thúc của lịch cũ (không cộng buffer để cho phép đặt lịch tiếp theo ngay)
        const existingEnd = new Date(
          existingStart.getTime() +
          parseDurationToMs(existingDurationStr)
        );

        // Overlap nếu: lịch mới bắt đầu trước khi lịch cũ kết thúc HOẶC lịch mới kết thúc sau khi lịch cũ bắt đầu
        // Cho phép đặt lịch mới ngay khi lịch cũ kết thúc (newStart >= existingEnd)
        const overlap =
          (newStart < existingEnd && newEnd > existingStart);

        if (overlap) {
          return res.status(400).json({
            message:
              "Technician đã có lịch trùng vào thời gian này. Vui lòng chọn technician khác hoặc để hệ thống tự động phân công.",
            success: false,
          });
        }
      }
    } else {
      // Tự động assign technician nếu khách không chọn
      selectedTechnician = await exports.autoAssignTechnician({
        center_id,
        appoinment_date,
        appoinment_time,
        serviceType,
      });

      if (!selectedTechnician) {
        return res.status(400).json({
          message:
            "Không tìm thấy technician khả dụng vào thời gian này. Tất cả technicians đã đủ slot hoặc đang bận.",
          success: false,
        });
      }
    }

    //  Tạo appointment mới
    const appointment = new Appointment({
      appoinment_date: new Date(appoinment_date),
      appoinment_time,
      notes,
      deposit_cost: DEPOSIT_COST, // Set deposit_cost từ constant
      final_cost: 0, // final_cost sẽ được set khi accept checklist
      user_id,
      vehicle_id,
      center_id,
      service_type_id,
      status: "pending",
      technician_id: selectedTechnician,
    });

    await appointment.save();

    try {
      const vehicleDoc = await Vehicle.findById(vehicle_id).select(
        "license_plate user_id"
      );
      if (vehicleDoc) {
        await createAppointmentReminder({
          appointment,
          vehicle: vehicleDoc,
        });
      }
    } catch (reminderErr) {
      console.error(
        "Create appointment reminder error:",
        reminderErr?.message || reminderErr
      );
    }

    //  Xử lý thanh toán tiền cọc nếu có
    const paymentResult = await exports.createDepositPayment(
      userId,
      appointment._id
    );
    if (paymentResult?.success) {
      appointment.payment_id = paymentResult.data.payment_id;
      await appointment.save();
    }

    // Populate thông tin technician đã được assign
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("user_id", "username fullName email phoneNumber")
      .populate("center_id", "center_name address phone")
      .populate("vehicle_id", "license_plate vin")
      .populate("technician_id", "username fullName email phoneNumber role")
      .populate(
        "service_type_id",
        "service_name description base_price estimated_duration"
      )
      .populate(
        "payment_id",
        "order_code orderCode amount status checkout_url checkoutUrl qr_code qrCode timeoutAt"
      )
      .lean();

    return res.status(201).json({
      message:
        selectedTechnician && !technician_id
          ? "Tạo appointment thành công. Hệ thống đã tự động phân công technician."
          : "Tạo appointment thành công",
      success: true,
      data: populatedAppointment,
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    return res.status(500).json({
      message: "Lỗi tạo appointment",
      error: error.message,
      success: false,
    });
  }
};
