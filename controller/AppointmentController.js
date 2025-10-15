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

exports.getAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      service_center_id,
      technician_id,
      customer_id,
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

// Lấy lịch làm việc của technician để check conflict trước khi assign
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

    // Validate technician
    const technician = await User.findById(technician_id);
    if (!technician || technician.role !== "technical") {
      return res.status(404).json({
        message: "Technician không tồn tại",
        success: false,
      });
    }

    // Lấy tất cả appointments của technician trong ngày
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

    // Lấy appointment và populate service_type để lấy estimated_duration
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

    // Validate technician
    const technician = await User.findById(technician_id);
    if (!technician || technician.role !== "technical") {
      return res.status(400).json({
        message: "Technician không tồn tại hoặc không có quyền",
        success: false,
      });
    }

    // Lấy estimated_duration từ service_type
    const estimatedDuration = appointment.service_type_id?.estimated_duration;
    if (!estimatedDuration) {
      return res.status(400).json({
        message: "Service type không có estimated_duration",
        success: false,
      });
    }

    // Tính thời gian kết thúc ước tính
    // Parse appointment_time (format: "09:00")
    const [hours, minutes] = appointment.appoinment_time.split(":");
    const startMinutes = parseInt(hours) * 60 + parseInt(minutes);

    // Parse estimated_duration (giả sử format: "2" nghĩa là 2 giờ)
    const durationMinutes = parseFloat(estimatedDuration) * 60;
    const endMinutes = startMinutes + durationMinutes;

    // Convert back to HH:mm
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const estimatedEndTime = `${String(endHours).padStart(2, "0")}:${String(
      endMins
    ).padStart(2, "0")}`;

    // Helper function để so sánh thời gian
    const timeToMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    // Check xem technician có đang bận trong khung giờ này không
    // Lấy tất cả appointments của technician trong cùng ngày
    const appointmentDate = new Date(appointment.appoinment_date);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const technicianAppointments = await Appointment.find({
      assigned: technician_id,
      appoinment_date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ["accepted", "assigned", "in_progress"] }, // Chỉ check appointments đang active
      _id: { $ne: appointment_id }, // Loại trừ appointment hiện tại
    }).lean();

    // Check conflict về thời gian
    for (const existingAppt of technicianAppointments) {
      if (!existingAppt.estimated_end_time) continue; // Skip nếu không có end time

      const newStart = timeToMinutes(appointment.appoinment_time);
      const newEnd = timeToMinutes(estimatedEndTime);
      const existStart = timeToMinutes(existingAppt.appoinment_time);
      const existEnd = timeToMinutes(existingAppt.estimated_end_time);

      // Check overlap: (newStart < existEnd) && (newEnd > existStart)
      if (newStart < existEnd && newEnd > existStart) {
        return res.status(400).json({
          message: `Technician đang bận từ ${existingAppt.appoinment_time} đến ${existingAppt.estimated_end_time}`,
          success: false,
          conflict: {
            appointment_id: existingAppt._id,
            time_start: existingAppt.appoinment_time,
            time_end: existingAppt.estimated_end_time,
          },
        });
      }
    }

    // Update appointment với thông tin assign và thời gian ước tính
    appointment.assigned_by = assignedBy;
    appointment.assigned = technician_id;
    appointment.estimated_end_time = estimatedEndTime;
    appointment.status = "accepted";
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
      data: {
        appointment: updatedAppointment,
        estimated_completion: estimatedEndTime,
      },
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

    const appointment = await Appointment.findById(appointment_id).populate(
      "payment_id"
    );
    if (!appointment) {
      return res.status(404).json({
        message: "Không tìm thấy appointment",
        success: false,
      });
    }

    const oldStatus = appointment.status;
    appointment.status = status;

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

exports.createAppointment = async (req, res) => {
  try {
    const {
      appoinment_date,
      appoinment_time,
      notes,
      user_id,
      vehicle_id,
      center_id,
      assigned,
      service_type_id,
    } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (
      !appoinment_date ||
      !appoinment_time ||
      !user_id ||
      !vehicle_id ||
      !center_id ||
      !service_type_id
    ) {
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc",
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

    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({
        message: "Không tìm thấy vehicle",
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

    const serviceType = await ServiceType.findById(service_type_id);
    if (!serviceType) {
      return res.status(404).json({
        message: "Không tìm thấy service type",
        success: false,
      });
    }

    if (assigned) {
      const technician = await User.findById(assigned);
      if (!technician) {
        return res.status(404).json({
          message: "Không tìm thấy technician",
          success: false,
        });
      }
      if (technician.role !== "technician") {
        return res.status(400).json({
          message: "User được gán không phải là technician",
          success: false,
        });
      }
    }

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
      assigned_by: null,
      assigned: assigned || null,
    });

    await appointment.save();

    const depositAmount = 2000;
    const depositDescription = `Tam ung ${appointment._id
      .toString()
      .slice(-6)}`;

    const paymentReq = {
      _id: userId,
      body: {
        amount: depositAmount,
        description: depositDescription,
      },
    };

    let paymentResult = null;
    const paymentRes = {
      status: (code) => ({
        json: (data) => {
          console.log(
            `Payment response - Status: ${code}, Data:`,
            JSON.stringify(data, null, 2)
          );
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
        amount: depositAmount,
        description: depositDescription,
        status: "pending",
        user_id: userId,
      });

      await fallbackPayment.save();
      paymentResult = {
        success: true,
        data: {
          payment_id: fallbackPayment._id,
          order_code: orderCode,
          amount: depositAmount,
          status: "pending",
        },
      };
    }

    if (paymentResult && paymentResult.success) {
      appointment.payment_id = paymentResult.data.payment_id;
      // Chưa trừ estimated_cost ở đây
      // estimated_cost sẽ trừ khi cập nhật status sang "deposited"
      await appointment.save();
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
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
      );

    return res.status(201).json({
      message: assigned
        ? "Tạo appointment thành công, đã chọn technician và tạo payment link tạm ứng"
        : "Tạo appointment thành công và tạo payment link tạm ứng",
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
