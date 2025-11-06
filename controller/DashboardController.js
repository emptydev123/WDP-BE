// controller/DashboardController.js
const Payment = require("../model/payment");
const Appointment = require("../model/appointment");
const User = require("../model/user");
const Vehicle = require("../model/vehicle");
const VehicleModel = require("../model/vehicleModel");
const Checklist = require("../model/checklist");

// Doanh thu từ Payments (PAID)
exports.getRevenue = async (req, res) => {
  try {
    const { date_from, date_to, center_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Filter theo thời gian
    const filter = { status: "PAID" };

    if (date_from || date_to) {
      filter.paidAt = {};
      if (date_from) {
        const fromDate = new Date(date_from);
        fromDate.setHours(0, 0, 0, 0);
        filter.paidAt.$gte = fromDate;
      }
      if (date_to) {
        const toDate = new Date(date_to);
        toDate.setHours(23, 59, 59, 999);
        filter.paidAt.$lte = toDate;
      }
    }

    // Tính tổng doanh thu
    const revenueResult = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const totalTransactions =
      revenueResult.length > 0 ? revenueResult[0].totalTransactions : 0;

    // Doanh thu theo ngày (nếu có date range)
    let dailyRevenue = [];
    if (date_from && date_to) {
      dailyRevenue = await Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
            },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    return res.status(200).json({
      message: "Lấy doanh thu thành công",
      success: true,
      data: {
        totalRevenue,
        totalTransactions,
        dailyRevenue,
        period: {
          from: date_from || null,
          to: date_to || null,
        },
      },
    });
  } catch (error) {
    console.error("Get revenue error:", error);
    return res.status(500).json({
      message: "Lỗi lấy doanh thu",
      error: error.message,
      success: false,
    });
  }
};

// Tỉ lệ thanh toán
exports.getPaymentRate = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Filter theo thời gian
    const timeFilter = {};
    if (date_from || date_to) {
      timeFilter.createdAt = {};
      if (date_from) {
        const fromDate = new Date(date_from);
        fromDate.setHours(0, 0, 0, 0);
        timeFilter.createdAt.$gte = fromDate;
      }
      if (date_to) {
        const toDate = new Date(date_to);
        toDate.setHours(23, 59, 59, 999);
        timeFilter.createdAt.$lte = toDate;
      }
    }

    // Đếm payments theo status
    const paymentStats = await Payment.aggregate([
      { $match: timeFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      PAID: 0,
      PENDING: 0,
      FAILED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
      TIMEOUT: 0,
    };

    paymentStats.forEach((stat) => {
      stats[stat._id] = stat.count;
    });

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const paidCount = stats.PAID;
    const pendingCount = stats.PENDING;
    const failedCount =
      stats.FAILED + stats.CANCELLED + stats.EXPIRED + stats.TIMEOUT;

    const paymentRate = total > 0 ? ((paidCount / total) * 100).toFixed(2) : 0;
    const successRate = total > 0 ? ((paidCount / total) * 100).toFixed(2) : 0;
    const failureRate =
      total > 0 ? ((failedCount / total) * 100).toFixed(2) : 0;

    return res.status(200).json({
      message: "Lấy tỉ lệ thanh toán thành công",
      success: true,
      data: {
        total,
        paidCount,
        pendingCount,
        failedCount,
        paymentRate: parseFloat(paymentRate),
        successRate: parseFloat(successRate),
        failureRate: parseFloat(failureRate),
        breakdown: stats,
        period: {
          from: date_from || null,
          to: date_to || null,
        },
      },
    });
  } catch (error) {
    console.error("Get payment rate error:", error);
    return res.status(500).json({
      message: "Lỗi lấy tỉ lệ thanh toán",
      error: error.message,
      success: false,
    });
  }
};

// Tỉ lệ của appointment (theo status)
exports.getAppointmentRate = async (req, res) => {
  try {
    const { date_from, date_to, center_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Filter theo thời gian
    const filter = {};
    if (date_from || date_to) {
      filter.appoinment_date = {};
      if (date_from) {
        const fromDate = new Date(date_from);
        fromDate.setHours(0, 0, 0, 0);
        filter.appoinment_date.$gte = fromDate;
      }
      if (date_to) {
        const toDate = new Date(date_to);
        toDate.setHours(23, 59, 59, 999);
        filter.appoinment_date.$lte = toDate;
      }
    }

    if (center_id) {
      filter.center_id = center_id;
    }

    // Đếm appointments theo status
    const appointmentStats = await Appointment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      pending: 0,
      assigned: 0,
      check_in: 0,
      in_progress: 0,
      repaired: 0,
      completed: 0,
      delay: 0,
      canceled: 0,
    };

    appointmentStats.forEach((stat) => {
      if (stats.hasOwnProperty(stat._id)) {
        stats[stat._id] = stat.count;
      }
    });

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const completedCount = stats.completed;
    const canceledCount = stats.canceled;
    const delayCount = stats.delay;
    const inProgressCount = stats.in_progress;

    const completionRate =
      total > 0 ? ((completedCount / total) * 100).toFixed(2) : 0;
    const cancellationRate =
      total > 0 ? ((canceledCount / total) * 100).toFixed(2) : 0;
    const delayRate = total > 0 ? ((delayCount / total) * 100).toFixed(2) : 0;

    return res.status(200).json({
      message: "Lấy tỉ lệ appointment thành công",
      success: true,
      data: {
        total,
        completedCount,
        canceledCount,
        delayCount,
        inProgressCount,
        completionRate: parseFloat(completionRate),
        cancellationRate: parseFloat(cancellationRate),
        delayRate: parseFloat(delayRate),
        breakdown: stats,
        period: {
          from: date_from || null,
          to: date_to || null,
        },
      },
    });
  } catch (error) {
    console.error("Get appointment rate error:", error);
    return res.status(500).json({
      message: "Lỗi lấy tỉ lệ appointment",
      error: error.message,
      success: false,
    });
  }
};

// Tỷ lệ check-in (dựa trên appointment có checkin_datetime)
exports.getCheckinRate = async (req, res) => {
  try {
    const { date_from, date_to, center_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Filter theo thời gian (appointment date)
    const filter = {};
    if (date_from || date_to) {
      filter.appoinment_date = {};
      if (date_from) {
        const fromDate = new Date(date_from);
        fromDate.setHours(0, 0, 0, 0);
        filter.appoinment_date.$gte = fromDate;
      }
      if (date_to) {
        const toDate = new Date(date_to);
        toDate.setHours(23, 59, 59, 999);
        filter.appoinment_date.$lte = toDate;
      }
    }

    if (center_id) {
      filter.center_id = center_id;
    }

    // Đếm appointments theo checkin_by và có check_in_time
    const checkinStats = await Appointment.aggregate([
      { $match: filter },
      {
        $match: {
          $or: [
            { check_in_time: { $ne: null } },
            { checkin_datetime: { $ne: null } }, // Tương thích với dữ liệu cũ
          ],
        },
      },
      {
        $group: {
          _id: "$checkin_by",
          count: { $sum: 1 },
        },
      },
    ]);

    // Tổng số appointments trong khoảng thời gian
    const totalAppointments = await Appointment.countDocuments(filter);

    // Tổng số appointments đã check-in
    const totalCheckins = await Appointment.countDocuments({
      ...filter,
      $or: [
        { check_in_time: { $ne: null } },
        { checkin_datetime: { $ne: null } }, // Tương thích với dữ liệu cũ
      ],
    });

    const stats = {
      customer: 0,
      staff: 0,
    };

    checkinStats.forEach((stat) => {
      if (stats.hasOwnProperty(stat._id)) {
        stats[stat._id] = stat.count;
      }
    });

    const checkinRate =
      totalAppointments > 0
        ? ((totalCheckins / totalAppointments) * 100).toFixed(2)
        : 0;
    const customerCheckinRate =
      totalCheckins > 0
        ? ((stats.customer / totalCheckins) * 100).toFixed(2)
        : 0;
    const staffCheckinRate =
      totalCheckins > 0 ? ((stats.staff / totalCheckins) * 100).toFixed(2) : 0;

    return res.status(200).json({
      message: "Lấy tỷ lệ check-in thành công",
      success: true,
      data: {
        totalAppointments,
        totalCheckins,
        checkinRate: parseFloat(checkinRate),
        customerCheckins: stats.customer,
        staffCheckins: stats.staff,
        customerCheckinRate: parseFloat(customerCheckinRate),
        staffCheckinRate: parseFloat(staffCheckinRate),
        breakdown: stats,
        period: {
          from: date_from || null,
          to: date_to || null,
        },
      },
    });
  } catch (error) {
    console.error("Get checkin rate error:", error);
    return res.status(500).json({
      message: "Lỗi lấy tỷ lệ check-in",
      error: error.message,
      success: false,
    });
  }
};

// Dashboard tổng hợp (tất cả metrics)
exports.getDashboardOverview = async (req, res) => {
  try {
    const { date_from, date_to, center_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Tính toán tất cả metrics song song
    const [revenueResult, paymentStats, appointmentStats, checkinStats] =
      await Promise.all([
        // Revenue từ Payments PAID
        Payment.aggregate([
          {
            $match: {
              status: "PAID",
              ...(date_from || date_to
                ? {
                    paidAt: {
                      ...(date_from ? { $gte: new Date(date_from) } : {}),
                      ...(date_to ? { $lte: new Date(date_to) } : {}),
                    },
                  }
                : {}),
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
              totalTransactions: { $sum: 1 },
            },
          },
        ]),

        // Payment rate
        Payment.aggregate([
          {
            $match: {
              ...(date_from || date_to
                ? {
                    createdAt: {
                      ...(date_from ? { $gte: new Date(date_from) } : {}),
                      ...(date_to ? { $lte: new Date(date_to) } : {}),
                    },
                  }
                : {}),
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),

        // Appointment rate
        Appointment.aggregate([
          {
            $match: {
              ...(date_from || date_to
                ? {
                    appoinment_date: {
                      ...(date_from ? { $gte: new Date(date_from) } : {}),
                      ...(date_to ? { $lte: new Date(date_to) } : {}),
                    },
                  }
                : {}),
              ...(center_id ? { center_id: center_id } : {}),
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),

        // Checkin rate (appointments có check_in_time hoặc checkin_datetime)
        Appointment.aggregate([
          {
            $match: {
              ...(date_from || date_to
                ? {
                    appoinment_date: {
                      ...(date_from ? { $gte: new Date(date_from) } : {}),
                      ...(date_to ? { $lte: new Date(date_to) } : {}),
                    },
                  }
                : {}),
              ...(center_id ? { center_id: center_id } : {}),
              $or: [
                { check_in_time: { $ne: null } },
                { checkin_datetime: { $ne: null } }, // Tương thích với dữ liệu cũ
              ],
            },
          },
          {
            $group: {
              _id: "$checkin_by",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    // Xử lý Revenue
    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const totalTransactions =
      revenueResult.length > 0 ? revenueResult[0].totalTransactions : 0;

    // Xử lý Payment Rate
    const paymentBreakdown = {
      PAID: 0,
      PENDING: 0,
      FAILED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
      TIMEOUT: 0,
    };
    paymentStats.forEach((stat) => {
      paymentBreakdown[stat._id] = stat.count;
    });
    const totalPayments = Object.values(paymentBreakdown).reduce(
      (a, b) => a + b,
      0
    );
    const paymentRate =
      totalPayments > 0
        ? ((paymentBreakdown.PAID / totalPayments) * 100).toFixed(2)
        : 0;

    // Xử lý Appointment Rate
    const appointmentBreakdown = {
      pending: 0,
      assigned: 0,
      check_in: 0,
      in_progress: 0,
      repaired: 0,
      completed: 0,
      delay: 0,
      canceled: 0,
    };
    appointmentStats.forEach((stat) => {
      if (appointmentBreakdown.hasOwnProperty(stat._id)) {
        appointmentBreakdown[stat._id] = stat.count;
      }
    });
    const totalAppointments = Object.values(appointmentBreakdown).reduce(
      (a, b) => a + b,
      0
    );
    const completionRate =
      totalAppointments > 0
        ? ((appointmentBreakdown.completed / totalAppointments) * 100).toFixed(
            2
          )
        : 0;

    // Xử lý Checkin Rate
    const checkinBreakdown = {
      customer: 0,
      staff: 0,
    };
    checkinStats.forEach((stat) => {
      if (checkinBreakdown.hasOwnProperty(stat._id)) {
        checkinBreakdown[stat._id] = stat.count;
      }
    });
    const totalCheckins = Object.values(checkinBreakdown).reduce(
      (a, b) => a + b,
      0
    );
    const customerCheckinRate =
      totalCheckins > 0
        ? ((checkinBreakdown.customer / totalCheckins) * 100).toFixed(2)
        : 0;
    const staffCheckinRate =
      totalCheckins > 0
        ? ((checkinBreakdown.staff / totalCheckins) * 100).toFixed(2)
        : 0;
    const overallCheckinRate =
      totalAppointments > 0
        ? ((totalCheckins / totalAppointments) * 100).toFixed(2)
        : 0;

    return res.status(200).json({
      message: "Lấy dashboard overview thành công",
      success: true,
      data: {
        revenue: {
          totalRevenue,
          totalTransactions,
        },
        paymentRate: {
          total: totalPayments,
          paid: paymentBreakdown.PAID,
          rate: parseFloat(paymentRate),
          breakdown: paymentBreakdown,
        },
        appointmentRate: {
          total: totalAppointments,
          completed: appointmentBreakdown.completed,
          completionRate: parseFloat(completionRate),
          breakdown: appointmentBreakdown,
        },
        checkinRate: {
          totalAppointments,
          totalCheckins,
          overallCheckinRate: parseFloat(overallCheckinRate),
          customerCheckins: checkinBreakdown.customer,
          staffCheckins: checkinBreakdown.staff,
          customerCheckinRate: parseFloat(customerCheckinRate),
          staffCheckinRate: parseFloat(staffCheckinRate),
          breakdown: checkinBreakdown,
        },
        period: {
          from: date_from || null,
          to: date_to || null,
        },
      },
    });
  } catch (error) {
    console.error("Get dashboard overview error:", error);
    return res.status(500).json({
      message: "Lỗi lấy dashboard overview",
      error: error.message,
      success: false,
    });
  }
};

// Hãng xe nào sửa nhiều nhất trong 3 tuần
exports.getTopBrandsByRepairs = async (req, res) => {
  try {
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Tính ngày 3 tuần trước
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    threeWeeksAgo.setHours(0, 0, 0, 0);

    // Lấy appointments trong 3 tuần qua
    const appointments = await Appointment.aggregate([
      {
        $match: {
          appoinment_date: { $gte: threeWeeksAgo },
          status: { $in: ["completed", "repaired", "in_progress"] },
        },
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicle_id",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      { $unwind: "$vehicle" },
      {
        $lookup: {
          from: "vehiclemodels",
          localField: "vehicle.model_id",
          foreignField: "_id",
          as: "vehicleModel",
        },
      },
      { $unwind: "$vehicleModel" },
      {
        $group: {
          _id: "$vehicleModel.brand",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const result = appointments.map((item) => ({
      brand: item._id || "Unknown",
      repairCount: item.count,
    }));

    return res.status(200).json({
      message: "Lấy danh sách hãng xe sửa nhiều nhất thành công",
      success: true,
      data: {
        period: "3 tuần qua",
        from: threeWeeksAgo,
        to: new Date(),
        brands: result,
      },
    });
  } catch (error) {
    console.error("Get top brands by repairs error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách hãng xe sửa nhiều nhất",
      error: error.message,
      success: false,
    });
  }
};

// Phụ tùng nào thay nhiều nhất trong tháng
exports.getTopPartsReplaced = async (req, res) => {
  try {
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Tính ngày đầu tháng hiện tại
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Lấy checklists trong tháng và đã được accepted hoặc completed
    const checklists = await Checklist.find({
      createdAt: { $gte: startOfMonth },
      status: { $in: ["accepted", "completed"] },
    }).populate("parts.part_id");

    // Tổng hợp số lượng từng part
    const partCounts = {};
    checklists.forEach((checklist) => {
      checklist.parts.forEach((part) => {
        const partId =
          part.part_id?._id?.toString() || part.part_id?.toString();
        const partName = part.part_id?.part_name || "Unknown Part";
        if (partId) {
          if (!partCounts[partId]) {
            partCounts[partId] = {
              part_id: partId,
              part_name: partName,
              totalQuantity: 0,
            };
          }
          partCounts[partId].totalQuantity += part.quantity || 0;
        }
      });
    });

    // Sắp xếp và lấy top 10
    const result = Object.values(partCounts)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    return res.status(200).json({
      message: "Lấy danh sách phụ tùng thay nhiều nhất thành công",
      success: true,
      data: {
        period: "Tháng này",
        from: startOfMonth,
        to: new Date(),
        parts: result,
      },
    });
  } catch (error) {
    console.error("Get top parts replaced error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách phụ tùng thay nhiều nhất",
      error: error.message,
      success: false,
    });
  }
};

// Nhân viên có nhiều appointment nhất
exports.getTopTechniciansByAppointments = async (req, res) => {
  try {
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const technicians = await Appointment.aggregate([
      {
        $match: {
          technician_id: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$technician_id",
          appointmentCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "technician",
        },
      },
      { $unwind: "$technician" },
      {
        $project: {
          technician_id: "$_id",
          technician_name: "$technician.fullName",
          technician_username: "$technician.username",
          technician_email: "$technician.email",
          appointmentCount: 1,
        },
      },
      { $sort: { appointmentCount: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      message: "Lấy danh sách nhân viên có nhiều appointment nhất thành công",
      success: true,
      data: {
        technicians: technicians.map((t) => ({
          technician_id: t.technician_id,
          technician_name: t.technician_name,
          technician_username: t.technician_username,
          technician_email: t.technician_email,
          appointment_count: t.appointmentCount,
        })),
      },
    });
  } catch (error) {
    console.error("Get top technicians by appointments error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách nhân viên có nhiều appointment nhất",
      error: error.message,
      success: false,
    });
  }
};

// Nhân viên kiếm nhiều tiền nhất
exports.getTopTechniciansByRevenue = async (req, res) => {
  try {
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Lấy appointments có technician và payment đã thanh toán
    const technicianRevenue = await Appointment.aggregate([
      {
        $match: {
          technician_id: { $ne: null },
          $or: [
            { payment_id: { $ne: null } },
            { final_payment_id: { $ne: null } },
          ],
        },
      },
      {
        $lookup: {
          from: "payments",
          localField: "payment_id",
          foreignField: "_id",
          as: "payment",
        },
      },
      {
        $lookup: {
          from: "payments",
          localField: "final_payment_id",
          foreignField: "_id",
          as: "finalPayment",
        },
      },
      {
        $project: {
          technician_id: 1,
          paymentAmount: {
            $cond: {
              if: { $eq: [{ $arrayElemAt: ["$payment.status", 0] }, "PAID"] },
              then: { $arrayElemAt: ["$payment.amount", 0] },
              else: 0,
            },
          },
          finalPaymentAmount: {
            $cond: {
              if: {
                $eq: [{ $arrayElemAt: ["$finalPayment.status", 0] }, "PAID"],
              },
              then: { $arrayElemAt: ["$finalPayment.amount", 0] },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: "$technician_id",
          totalRevenue: {
            $sum: {
              $add: ["$paymentAmount", "$finalPaymentAmount"],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "technician",
        },
      },
      { $unwind: "$technician" },
      {
        $project: {
          technician_id: "$_id",
          technician_name: "$technician.fullName",
          technician_username: "$technician.username",
          technician_email: "$technician.email",
          totalRevenue: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      message: "Lấy danh sách nhân viên kiếm nhiều tiền nhất thành công",
      success: true,
      data: {
        technicians: technicianRevenue.map((t) => ({
          technician_id: t.technician_id,
          technician_name: t.technician_name,
          technician_username: t.technician_username,
          technician_email: t.technician_email,
          total_revenue: t.totalRevenue || 0,
        })),
      },
    });
  } catch (error) {
    console.error("Get top technicians by revenue error:", error);
    return res.status(500).json({
      message: "Lỗi lấy danh sách nhân viên kiếm nhiều tiền nhất",
      error: error.message,
      success: false,
    });
  }
};
