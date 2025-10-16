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
} = require("../utils/timeUtils");

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

    // Filter cơ bản
    if (status) {
      query.status = status;
    }
    if (service_center_id) {
      query.center_id = service_center_id;
    }
    if (technician_id) {
      query.assigned = technician_id;
    }
    if (customer_id) {
      query.user_id = customer_id;
    }

    // Filter theo thời gian thực - technician đang làm việc
    if (is_working_now === "true") {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      // Lấy appointments đang in_progress hoặc assigned trong hôm nay
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      query.appoinment_date = {
        $gte: startOfToday,
        $lte: endOfToday,
      };
      query.status = { $in: ["in_progress", "assigned", "accepted"] };
      query.assigned = { $ne: null };
      // Note: Sẽ filter thêm dựa trên estimated_end_time sau khi query
    }

    // Filter theo ngày cụ thể
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

    // Filter theo khoảng thời gian (date range)
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
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "center_name address phone")
      .populate("vehicle_id", "license_plate vin")
      .populate("assigned_by", "username fullName email phone role")
      .populate("assigned", "username fullName email phone role")
      .populate("payment_id", "order_code amount status checkout_url qr_code")
      .populate(
        "final_payment_id",
        "order_code amount status checkout_url qr_code"
      )
      .populate(
        "service_type_id",
        "service_name description base_price estimated_duration"
      )
      .sort({ appoinment_date: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    // Post-processing cho is_working_now - sử dụng utility functions
    if (is_working_now === "true") {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      const currentTimeMinutes = timeToMinutes(currentTime);

      appointments = appointments.filter((appt) => {
        if (!appt.estimated_end_time) return false;

        const startMinutes = timeToMinutes(appt.appoinment_time);
        const endMinutes = timeToMinutes(appt.estimated_end_time);

        // Check nếu hiện tại nằm trong khoảng start -> end
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
    const { technician_id, date } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!technician_id || !date) {
      return res.status(400).json({
        message: "Thiếu technician_id hoặc date",
        success: false,
      });
    }

    const technician = await User.findById(technician_id);
    if (!technician || technician.role !== "technical") {
      return res.status(404).json({
        message: "Technician không tồn tại",
        success: false,
      });
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await Appointment.find({
      assigned: technician_id,
      appoinment_date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ["accepted", "assigned", "in_progress"] },
    })
      .select("appoinment_time estimated_end_time status")
      .sort({ appoinment_time: 1 })
      .lean();

    return res.status(200).json({
      message: "Lấy lịch làm việc của technician thành công",
      success: true,
      data: {
        technician: {
          _id: technician._id,
          fullName: technician.fullName,
        },
        date,
        schedules,
        is_available: schedules.length === 0,
        total_assignments: schedules.length,
      },
    });
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
    const assignedBy = req._id?.toString();

    if (!assignedBy) {
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

    if (appointment.assigned) {
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

    // RULE 2: Check conflict - CHỈ với appointments đang in_progress
    // Lấy appointments của technician đang làm việc (status = in_progress)
    const technicianAppointments = await Appointment.find({
      assigned: technician_id,
      status: "in_progress", // CHỈ check appointments đang làm việc
      estimated_end_time: { $ne: null }, // Phải có estimated_end_time
      _id: { $ne: appointment_id },
    }).lean();

    // Check conflict với buffer 1 tiếng
    // VD: Đơn A estimated_end_time = 09:30 → Buffer đến 10:30
    // → Đơn B phải có appoinment_time >= 10:30 mới được assign
    const BUFFER_HOURS = 1;
    const newAppointmentTimeMinutes = timeToMinutes(
      appointment.appoinment_time
    );

    for (const existingAppt of technicianAppointments) {
      // Cộng buffer 1 tiếng vào estimated_end_time sử dụng utility function
      const endTimeWithBuffer = addBufferToTime(
        existingAppt.estimated_end_time,
        BUFFER_HOURS
      );
      const endTimeWithBufferMinutes = timeToMinutes(endTimeWithBuffer);

      // Conflict: Appointment mới bắt đầu TRƯỚC thời gian kết thúc có buffer
      // VD: Existing end = 10:30, new start = 10:10 → Conflict
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

    appointment.assigned_by = assignedBy;
    appointment.assigned = technician_id;
    appointment.status = "assigned";
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment_id)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate("assigned_by", "username fullName email phone role")
      .populate("assigned", "username fullName email phone role")
      .populate("payment_id", "order_code amount status checkout_url qr_code")
      .populate(
        "final_payment_id",
        "order_code amount status checkout_url qr_code"
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

// Lấy appointments của user hiện tại đang đăng nhập
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
      query.status = status;
    }

    const total = await Appointment.countDocuments(query);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate("assigned_by", "username fullName email phone role")
      .populate("assigned", "username fullName email phone role")
      .populate("payment_id", "order_code amount status checkout_url qr_code")
      .populate(
        "final_payment_id",
        "order_code amount status checkout_url qr_code"
      )
      .populate(
        "service_type_id",
        "service_name description base_price estimated_duration"
      )
      .sort({ appoinment_date: -1 })
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
      "accepted",
      "deposited",
      "in_progress",
      "completed",
      "paid",
      "canceled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Status không hợp lệ. Chỉ chấp nhận: pending, accepted, deposited, in_progress, completed, paid, canceled",
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

    // Khi chuyển sang in_progress, cập nhật thời gian bắt đầu thực tế và tính end time
    if (status === "in_progress" && oldStatus !== "in_progress") {
      const estimatedDuration = appointment.service_type_id?.estimated_duration;

      if (estimatedDuration) {
        // Lấy thời gian thực tế technician bắt đầu làm sử dụng utility function
        const actualStartTime = getCurrentTime();

        // Cập nhật appoinment_time = thời gian thực tế bắt đầu làm
        appointment.appoinment_time = actualStartTime;

        // Tính end time = actual start time + duration
        const durationHours = parseFloat(estimatedDuration);
        const estimatedEndTime = calculateEndTime(
          actualStartTime,
          durationHours
        );

        appointment.estimated_end_time = estimatedEndTime;
      }
    }

    if (oldStatus === "pending" && status === "deposited") {
      const depositAmount = appointment.payment_id?.amount || 100000;
      appointment.estimated_cost = Math.max(
        0,
        appointment.estimated_cost - depositAmount
      );
    }

    if (status === "paid") {
      appointment.estimated_cost = 0;
    }

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
      .populate("assigned_by", "username fullName email phone role")
      .populate("assigned", "username fullName email phone role")
      .populate("payment_id", "order_code amount status checkout_url qr_code")
      .populate(
        "final_payment_id",
        "order_code amount status checkout_url qr_code"
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
      query.status = status;
    }

    const total = await Appointment.countDocuments(query);

    const pagination = createPagination(validatedPage, validatedLimit, total);

    const appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate("assigned_by", "username fullName email phone role")
      .populate("assigned", "username fullName email phone role")
      .populate("payment_id", "order_code amount status checkout_url qr_code")
      .populate(
        "final_payment_id",
        "order_code amount status checkout_url qr_code"
      )
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

    const query = { assigned: technicianId };
    if (status) {
      query.status = status;
    }

    const total = await Appointment.countDocuments(query);

    const pagination = createPagination(validatedPage, validatedLimit, total);

    const appointments = await Appointment.find(query)
      .populate("user_id", "username fullName email phone")
      .populate("center_id", "name address phone")
      .populate("vehicle_id", "license_plate brand model year")
      .populate("assigned_by", "username fullName email phone role")
      .populate("assigned", "username fullName email phone role")
      .populate("payment_id", "order_code amount status checkout_url qr_code")
      .populate(
        "final_payment_id",
        "order_code amount status checkout_url qr_code"
      )
      .sort({ appoinment_date: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createAppointmentResponse(
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
      .populate("user_id", "username fullName email");

    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    if (appointment.status !== "completed") {
      return res.status(400).json({
        message: "Chỉ có thể tạo final payment cho appointment đã hoàn thành",
        success: false,
      });
    }

    if (appointment.final_payment_id) {
      return res.status(400).json({
        message: "Appointment đã có final payment",
        success: false,
      });
    }

    const remainingAmount = appointment.estimated_cost || 0;

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
        order_code: orderCode,
        amount: remainingAmount,
        description: finalPaymentDescription,
        status: "pending",
        user_id: appointment.user_id._id,
      });

      await fallbackPayment.save();
      paymentResult = {
        success: true,
        data: {
          payment_id: fallbackPayment._id,
          order_code: orderCode,
          amount: remainingAmount,
          status: "pending",
        },
      };
    }

    if (paymentResult && paymentResult.success) {
      appointment.final_payment_id = paymentResult.data.payment_id;
      await appointment.save();

      const populatedAppointment = await Appointment.findById(appointmentId)
        .populate("user_id", "username fullName email phone")
        .populate("center_id", "name address phone")
        .populate("vehicle_id", "license_plate brand model year")
        .populate("assigned_by", "username fullName email phone role")
        .populate("assigned", "username fullName email phone role")
        .populate("payment_id", "order_code amount status checkout_url qr_code")
        .populate(
          "final_payment_id",
          "order_code amount status checkout_url qr_code"
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
exports.validateAppointmentRules = async ({
  appoinment_date,
  appoinment_time,
  center_id,
  vehicle_id,
  service_type_id,
  serviceType,
  existingAppointments,
}) => {
  const BUFFER_MS = 5 * 60 * 1000;
  const newStart = buildLocalDateTime(appoinment_date, appoinment_time);
  const newEnd = new Date(
    newStart.getTime() +
      parseDurationToMs(serviceType.estimated_duration) +
      BUFFER_MS
  );

  const activeStatuses = ["pending", "in_progress"]; // trạng thái "đang hoạt động"
  const finishedStatuses = ["completed", "cancelled"]; // trạng thái đã kết thúc

  // CASE 0: Cùng xe, cùng trung tâm, cùng dịch vụ, cùng ngày & giờ (bất kỳ trạng thái nào trừ cancelled/completed)
  const exactSame = existingAppointments.find(
    (a) =>
      a.center_id._id.toString() === center_id &&
      a.vehicle_id._id.toString() === vehicle_id &&
      a.service_type_id._id.toString() === service_type_id &&
      a.appoinment_date.toISOString().split("T")[0] === appoinment_date &&
      a.appoinment_time === appoinment_time &&
      !finishedStatuses.includes(a.status)
  );
  if (exactSame) {
    return "Đã tồn tại lịch hẹn trùng hoàn toàn (trung tâm, xe, dịch vụ, ngày, giờ).";
  }

  // CASE 1: Cùng trung tâm, xe, dịch vụ → tối đa 2 lần (chỉ tính pending/in_progress)
  const sameCombo = existingAppointments.filter(
    (a) =>
      a.center_id._id.toString() === center_id &&
      a.vehicle_id._id.toString() === vehicle_id &&
      a.service_type_id._id.toString() === service_type_id &&
      a.appoinment_date.toISOString().split("T")[0] === appoinment_date &&
      activeStatuses.includes(a.status)
  );
  if (sameCombo.length >= 2) {
    return "Bạn chỉ có thể tạo tối đa 2 lịch đang hoạt động (pending/in_progress) cho cùng trung tâm, xe và dịch vụ.";
  }

  // CASE 2: Trung tâm khác nhưng cùng giờ
  const sameTimeConflict = existingAppointments.find(
    (a) =>
      a.appoinment_date.toISOString().split("T")[0] === appoinment_date &&
      a.appoinment_time === appoinment_time &&
      a.vehicle_id._id.toString() === vehicle_id &&
      a.center_id._id.toString() !== center_id &&
      !finishedStatuses.includes(a.status)
  );
  if (sameTimeConflict) {
    return "Xe này đã có lịch ở trung tâm khác tại cùng thời điểm.";
  }

  // CASE 3: Overlap theo estimated_duration (tính buffer)
  const overlapAppointment = existingAppointments.find((a) => {
    if (a.vehicle_id._id.toString() !== vehicle_id) return false;

    const existingDateStr = a.appoinment_date.toISOString().split("T")[0];
    if (existingDateStr !== appoinment_date) return false;

    const existingDurationStr =
      (a.service_type_id && a.service_type_id.estimated_duration) ||
      a.estimated_duration;

    const existingStart = buildLocalDateTime(
      existingDateStr,
      a.appoinment_time
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

    return overlap && !finishedStatuses.includes(a.status);
  });
  if (overlapAppointment)
    return "Xe này đã có lịch trong khoảng thời gian này (bao gồm thời lượng dịch vụ).";

  return null; // hợp lệ
};

exports.createDepositPayment = async (userId, appointmentId) => {
  const depositAmount = 2000;
  const description = `Tam ung ${appointmentId.toString().slice(-6)}`;

  let paymentResult = null;
  const paymentReq = {
    _id: userId,
    body: { amount: depositAmount, description },
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
      order_code: orderCode,
      amount: depositAmount,
      description,
      status: "pending",
      user_id: userId,
    });
    await fallback.save();
    paymentResult = {
      success: true,
      data: {
        payment_id: fallback._id,
        order_code: orderCode,
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
    } = req.body;
    const userId = req._id?.toString();
    if (!userId)
      return res.status(401).json({ message: "Unauthorized", success: false });

    // Validate entity tồn tại
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

    // Lấy danh sách lịch cũ
    const existingAppointments = await Appointment.find({
      user_id,
      status: {
        $in: [
          "pending",
          "confirmed",
          "in_progress",
          "deposited",
          "completed",
          "paid",
        ],
      },
    }).populate("service_type_id center_id vehicle_id");

    // Check rule tổng hợp
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

    // Tạo appointment
    const appointment = new Appointment({
      appoinment_date: new Date(appoinment_date),
      appoinment_time,
      notes,
      estimated_cost: serviceType.base_price || 0,
      user_id,
      vehicle_id,
      center_id,
      service_type_id,
      status: "pending",
    });
    await appointment.save();

    // Tạo link thanh toán
    const paymentResult = await exports.createDepositPayment(
      userId,
      appointment._id
    );
    if (paymentResult?.success) {
      appointment.payment_id = paymentResult.data.payment_id;
      await appointment.save();
    }

    return res.status(201).json({
      message: "Tạo appointment thành công",
      success: true,
      data: appointment,
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
