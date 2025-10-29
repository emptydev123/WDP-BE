// controller/CheckinController.js
const Checkin = require("../model/checkin");
const Appointment = require("../model/appointment");
const User = require("../model/user");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

// Tạo checkin mới
exports.createCheckin = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { notes, checkin_type = "arrival", isDelay } = req.body;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
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

    // Kiểm tra quyền - chỉ customer của appointment này hoặc staff mới được checkin
    const user = await User.findById(userId);
    if (
      appointment.user_id.toString() !== userId &&
      !["staff", "admin"].includes(user?.role)
    ) {
      return res.status(403).json({
        message: "Bạn không có quyền checkin appointment này",
        success: false,
      });
    }

    // Tính scheduled_datetime từ appointment_date + appointment_time
    const scheduledDate = new Date(appointment.appoinment_date);
    const timeParts = appointment.appoinment_time.split(":");
    scheduledDate.setHours(
      parseInt(timeParts[0]),
      parseInt(timeParts[1]),
      0,
      0
    );

    // Tính checkin_datetime (thời gian hiện tại)
    const checkinDatetime = new Date();

    // Tính chênh lệch thời gian (phút)
    const timeDiff = checkinDatetime - scheduledDate; // milliseconds
    let minutesDiff = Math.floor(timeDiff / (1000 * 60));

    // Xác định checkin_status
    // Nếu isDelay = true → status = "delay"
    // Nếu isDelay = false hoặc không truyền → status chỉ có thể là "on_time", "early", "late"
    let checkinStatus = "on_time";
    let isDelayed = false;

    if (isDelay === true) {
      // Nếu client truyền isDelay = true → status = delay
      checkinStatus = "delay";
      isDelayed = true;
    } else {
      // Tính toán bình thường - chỉ có thể là on_time, early, late
      if (minutesDiff < -30) {
        checkinStatus = "early"; // Đến sớm hơn 30 phút
      } else if (minutesDiff > 30) {
        checkinStatus = "late"; // Đến muộn hơn 30 phút
      } else {
        // Trong khoảng -30 đến +30 phút → đúng giờ
        checkinStatus = "on_time";
      }

      // is_delayed chỉ true nếu có isDelay = true (đã set ở trên)
      isDelayed = false;
    }

    // Tạo checkin record
    const checkin = new Checkin({
      appointment_id: appointmentId,
      user_id: userId,
      checkin_datetime: checkinDatetime,
      scheduled_datetime: scheduledDate,
      checkin_status: checkinStatus,
      minutes_difference: minutesDiff,
      is_delayed: isDelayed,
      notes: notes || "",
      checkin_type: checkin_type,
    });

    await checkin.save();

    // Chỉ update appointment status = delay nếu isDelay = true
    // Nếu không → update appointment status = check_in
    if (isDelayed) {
      appointment.status = "delay";
      await appointment.save();
    } else {
      appointment.status = "check_in";
      await appointment.save();
    }

    // Populate để có đầy đủ thông tin
    await checkin.populate([
      { path: "appointment_id" },
      { path: "user_id", select: "username fullName email phone" },
    ]);

    return res.status(201).json({
      message: "Checkin thành công",
      success: true,
      data: checkin,
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

// Lấy danh sách checkin (có filter theo appointment_id, type, status)
exports.getAllCheckins = async (req, res) => {
  try {
    const { page = 1, limit = 10, appointment_id, type, status } = req.query;
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

    // Filter
    const filter = {};
    if (appointment_id) {
      filter.appointment_id = appointment_id;
    }
    if (type) {
      // Validate type: arrival, return, pickup
      const validTypes = ["arrival", "return", "pickup"];
      if (validTypes.includes(type)) {
        filter.checkin_type = type;
      }
    }
    if (status) {
      // Validate status: on_time, early, late, delay
      const validStatuses = ["on_time", "early", "late", "delay"];
      if (validStatuses.includes(status)) {
        filter.checkin_status = status;
      }
    }

    const total = await Checkin.countDocuments(filter);
    const pagination = createPagination(validatedPage, validatedLimit, total);

    const checkins = await Checkin.find(filter)
      .populate("appointment_id", "appoinment_date appoinment_time status")
      .populate("user_id", "username fullName email phone")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean();

    const response = createPaginatedResponse(
      checkins,
      pagination,
      "Lấy danh sách checkin thành công"
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get all checkins error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách checkin",
      error: error.message,
      success: false,
    });
  }
};
