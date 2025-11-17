// controller/DashboardController.js
const mongoose = require("mongoose");
const Payment = require("../model/payment");
const Appointment = require("../model/appointment");
const User = require("../model/user");
const Vehicle = require("../model/vehicle");
const VehicleModel = require("../model/vehicleModel");
const Checklist = require("../model/checklist");

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
    const [revenueResult, paymentStats, appointmentStats] = await Promise.all([
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
            ...(center_id
              ? {
                  center_id:
                    typeof center_id === "string"
                      ? new mongoose.Types.ObjectId(center_id)
                      : center_id,
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

    // Tính tỉ lệ cho từng status payment
    const paymentRates = {
      PAID:
        totalPayments > 0
          ? ((paymentBreakdown.PAID / totalPayments) * 100).toFixed(2)
          : 0,
      PENDING:
        totalPayments > 0
          ? ((paymentBreakdown.PENDING / totalPayments) * 100).toFixed(2)
          : 0,
      FAILED:
        totalPayments > 0
          ? ((paymentBreakdown.FAILED / totalPayments) * 100).toFixed(2)
          : 0,
      CANCELLED:
        totalPayments > 0
          ? ((paymentBreakdown.CANCELLED / totalPayments) * 100).toFixed(2)
          : 0,
      EXPIRED:
        totalPayments > 0
          ? ((paymentBreakdown.EXPIRED / totalPayments) * 100).toFixed(2)
          : 0,
      TIMEOUT:
        totalPayments > 0
          ? ((paymentBreakdown.TIMEOUT / totalPayments) * 100).toFixed(2)
          : 0,
    };

    // Xử lý Appointment Rate
    const appointmentBreakdown = {
      pending: 0,
      assigned: 0,
      check_in: 0,
      in_progress: 0,
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

    // Tính tỉ lệ cho từng status appointment
    const appointmentRates = {
      pending:
        totalAppointments > 0
          ? ((appointmentBreakdown.pending / totalAppointments) * 100).toFixed(
              2
            )
          : 0,
      assigned:
        totalAppointments > 0
          ? ((appointmentBreakdown.assigned / totalAppointments) * 100).toFixed(
              2
            )
          : 0,
      check_in:
        totalAppointments > 0
          ? ((appointmentBreakdown.check_in / totalAppointments) * 100).toFixed(
              2
            )
          : 0,
      in_progress:
        totalAppointments > 0
          ? (
              (appointmentBreakdown.in_progress / totalAppointments) *
              100
            ).toFixed(2)
          : 0,
      completed:
        totalAppointments > 0
          ? (
              (appointmentBreakdown.completed / totalAppointments) *
              100
            ).toFixed(2)
          : 0,
      delay:
        totalAppointments > 0
          ? ((appointmentBreakdown.delay / totalAppointments) * 100).toFixed(2)
          : 0,
      canceled:
        totalAppointments > 0
          ? ((appointmentBreakdown.canceled / totalAppointments) * 100).toFixed(
              2
            )
          : 0,
    };

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
          breakdown: {
            ...paymentBreakdown,
            rates: {
              PAID: parseFloat(paymentRates.PAID),
              PENDING: parseFloat(paymentRates.PENDING),
              FAILED: parseFloat(paymentRates.FAILED),
              CANCELLED: parseFloat(paymentRates.CANCELLED),
              EXPIRED: parseFloat(paymentRates.EXPIRED),
              TIMEOUT: parseFloat(paymentRates.TIMEOUT),
            },
          },
        },
        appointmentRate: {
          total: totalAppointments,
          breakdown: {
            ...appointmentBreakdown,
            rates: {
              pending: parseFloat(appointmentRates.pending),
              assigned: parseFloat(appointmentRates.assigned),
              check_in: parseFloat(appointmentRates.check_in),
              in_progress: parseFloat(appointmentRates.in_progress),
              completed: parseFloat(appointmentRates.completed),
              delay: parseFloat(appointmentRates.delay),
              canceled: parseFloat(appointmentRates.canceled),
            },
          },
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

// Hãng xe nào sửa nhiều nhất (có thể filter theo thời gian, center_id, vehicle_id)
exports.getTopBrandsByRepairs = async (req, res) => {
  try {
    const userId = req._id?.toString();
    const { date_from, date_to, center_id, status, vehicle_id } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Tạo match filter
    const matchFilter = {};

    // Xác định khoảng thời gian nếu có filter
    if (date_from || date_to) {
      matchFilter.appoinment_date = {};
      if (date_from) {
        const startDate = new Date(date_from);
        startDate.setHours(0, 0, 0, 0);
        matchFilter.appoinment_date.$gte = startDate;
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        matchFilter.appoinment_date.$lte = endDate;
      }
    }

    // Thêm filter status nếu có, nếu không thì lấy tất cả
    if (status) {
      matchFilter.status = status;
    }

    // Thêm filter center_id nếu có
    if (center_id) {
      matchFilter.center_id =
        typeof center_id === "string"
          ? new mongoose.Types.ObjectId(center_id)
          : center_id;
    }

    // Thêm filter vehicle_id nếu có (để lọc xe nào đến sửa nhiều nhất)
    if (vehicle_id) {
      matchFilter.vehicle_id =
        typeof vehicle_id === "string"
          ? new mongoose.Types.ObjectId(vehicle_id)
          : vehicle_id;
    }

    const pipeline = [
      {
        $match: matchFilter,
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
    ];

    // Nếu có vehicle_id filter, group theo vehicle thay vì brand
    if (vehicle_id) {
      pipeline.push({
        $group: {
          _id: "$vehicle_id",
          vehicle_info: {
            $first: {
              license_plate: "$vehicle.license_plate",
              brand: "$vehicleModel.brand",
              model: "$vehicleModel.model_name",
            },
          },
          count: { $sum: 1 },
        },
      });
    } else {
      pipeline.push({
        $group: {
          _id: "$vehicleModel.brand",
          count: { $sum: 1 },
        },
      });
    }

    // Sắp xếp theo count giảm dần (top cao nhất đi xuống)
    pipeline.push({ $sort: { count: -1 } });

    // Không giới hạn số lượng - lấy tất cả
    const appointments = await Appointment.aggregate(pipeline);

    let result;
    if (vehicle_id) {
      result = appointments.map((item) => ({
        vehicle_id: item._id,
        license_plate: item.vehicle_info?.license_plate || "Unknown",
        brand: item.vehicle_info?.brand || "Unknown",
        model: item.vehicle_info?.model || "Unknown",
        repairCount: item.count,
      }));
    } else {
      result = appointments.map((item) => ({
        brand: item._id || "Unknown",
        repairCount: item.count,
      }));
    }

    return res.status(200).json({
      message: vehicle_id
        ? "Lấy danh sách xe sửa nhiều nhất thành công"
        : "Lấy danh sách hãng xe sửa nhiều nhất thành công",
      success: true,
      data: {
        period: date_from || date_to ? "Theo khoảng thời gian" : "Tất cả",
        from: date_from || null,
        to: date_to || null,
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

// Phụ tùng nào thay nhiều nhất (có thể filter theo thời gian và center_id)
exports.getTopPartsReplaced = async (req, res) => {
  try {
    const userId = req._id?.toString();
    const { date_from, date_to, center_id, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Tạo filter cho checklist
    const checklistFilter = {};

    // Xác định khoảng thời gian nếu có filter
    if (date_from || date_to) {
      checklistFilter.createdAt = {};
      if (date_from) {
        const startDate = new Date(date_from);
        startDate.setHours(0, 0, 0, 0);
        checklistFilter.createdAt.$gte = startDate;
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        checklistFilter.createdAt.$lte = endDate;
      }
    }

    // Thêm filter status nếu có, nếu không thì lấy tất cả
    if (status) {
      checklistFilter.status = status;
    }

    // Lấy checklists (không giới hạn thời gian nếu không có filter)
    let checklists = await Checklist.find(checklistFilter)
      .populate("parts.part_id")
      .populate({
        path: "appointment_id",
        select: "center_id",
      });

    // Filter theo center_id nếu có (thông qua appointment)
    if (center_id) {
      checklists = checklists.filter(
        (checklist) =>
          checklist.appointment_id &&
          checklist.appointment_id.center_id &&
          checklist.appointment_id.center_id.toString() === center_id
      );
    }

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

    // Sắp xếp theo totalQuantity giảm dần (top cao nhất đi xuống) - không giới hạn
    const result = Object.values(partCounts).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );

    return res.status(200).json({
      message: "Lấy danh sách phụ tùng thay nhiều nhất thành công",
      success: true,
      data: {
        period: date_from || date_to ? "Theo khoảng thời gian" : "Tất cả",
        from: date_from || null,
        to: date_to || null,
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

// Nhân viên có nhiều appointment nhất (có thể filter theo thời gian và center_id)
exports.getTopTechniciansByAppointments = async (req, res) => {
  try {
    const userId = req._id?.toString();
    const { date_from, date_to, center_id, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Tạo match filter
    const matchFilter = {
      technician_id: { $ne: null },
    };

    // Xác định khoảng thời gian nếu có filter
    if (date_from || date_to) {
      matchFilter.appoinment_date = {};
      if (date_from) {
        const startDate = new Date(date_from);
        startDate.setHours(0, 0, 0, 0);
        matchFilter.appoinment_date.$gte = startDate;
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        matchFilter.appoinment_date.$lte = endDate;
      }
    }

    // Thêm filter status nếu có, nếu không thì lấy tất cả
    if (status) {
      matchFilter.status = status;
    }

    // Thêm filter center_id nếu có
    if (center_id) {
      matchFilter.center_id =
        typeof center_id === "string"
          ? new mongoose.Types.ObjectId(center_id)
          : center_id;
    }

    const technicians = await Appointment.aggregate([
      {
        $match: matchFilter,
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
      { $sort: { appointmentCount: -1 } }, // Sắp xếp top cao nhất đi xuống, không giới hạn
    ]);

    return res.status(200).json({
      message: "Lấy danh sách nhân viên có nhiều appointment nhất thành công",
      success: true,
      data: {
        period: date_from || date_to ? "Theo khoảng thời gian" : "Tất cả",
        from: date_from || null,
        to: date_to || null,
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

// Nhân viên kiếm nhiều tiền nhất (có thể filter theo thời gian và center_id)
exports.getTopTechniciansByRevenue = async (req, res) => {
  try {
    const userId = req._id?.toString();
    const { date_from, date_to, center_id, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Tạo match filter
    const matchFilter = {
      technician_id: { $ne: null },
      $or: [{ payment_id: { $ne: null } }, { final_payment_id: { $ne: null } }],
    };

    // Xác định khoảng thời gian nếu có filter
    if (date_from || date_to) {
      matchFilter.appoinment_date = {};
      if (date_from) {
        const startDate = new Date(date_from);
        startDate.setHours(0, 0, 0, 0);
        matchFilter.appoinment_date.$gte = startDate;
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        matchFilter.appoinment_date.$lte = endDate;
      }
    }

    // Thêm filter status nếu có, nếu không thì lấy tất cả
    if (status) {
      matchFilter.status = status;
    }

    // Thêm filter center_id nếu có
    if (center_id) {
      matchFilter.center_id =
        typeof center_id === "string"
          ? new mongoose.Types.ObjectId(center_id)
          : center_id;
    }

    // Lấy appointments có technician và payment đã thanh toán
    const technicianRevenue = await Appointment.aggregate([
      {
        $match: matchFilter,
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
      { $sort: { totalRevenue: -1 } }, // Sắp xếp top cao nhất đi xuống, không giới hạn
    ]);

    return res.status(200).json({
      message: "Lấy danh sách nhân viên kiếm nhiều tiền nhất thành công",
      success: true,
      data: {
        period: date_from || date_to ? "Theo khoảng thời gian" : "Tất cả",
        from: date_from || null,
        to: date_to || null,
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
