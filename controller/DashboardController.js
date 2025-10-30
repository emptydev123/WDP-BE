const Appointment = require("../model/appointment");
const Payment = require("../model/payment");

// Helpers
function parseDateRange(query) {
  const { from, to } = query || {};
  const range = {};
  if (from || to) {
    range.$gte = from ? new Date(from) : undefined;
    range.$lte = to ? new Date(to) : undefined;
    Object.keys(range).forEach(
      (k) => range[k] === undefined && delete range[k]
    );
  }
  return Object.keys(range).length ? range : null;
}

exports.getRevenue = async (req, res) => {
  try {
    const createdAt = parseDateRange(req.query);
    const match = { status: "paid" };
    if (createdAt) match.createdAt = createdAt;

    const result = await Payment.aggregate([
      { $match: match },
      {
        $group: { _id: null, revenue: { $sum: "$amount" }, count: { $sum: 1 } },
      },
    ]);

    const revenue = result[0]?.revenue || 0;
    const count = result[0]?.count || 0;

    return res
      .status(200)
      .json({
        success: true,
        message: "Get revenue successfully",
        data: { revenue, count },
      });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

exports.getPaymentRate = async (req, res) => {
  try {
    const createdAt = parseDateRange(req.query);
    const match = {};
    if (createdAt) match.createdAt = createdAt;

    const stats = await Payment.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const breakdown = { pending: 0, paid: 0, cancelled: 0 };
    let total = 0;
    stats.forEach((s) => {
      if (breakdown.hasOwnProperty(s._id)) breakdown[s._id] = s.count;
      total += s.count;
    });

    const rate = total > 0 ? breakdown.paid / total : 0;
    return res
      .status(200)
      .json({
        success: true,
        message: "Get payment rate successfully",
        data: { total, rate, breakdown },
      });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

exports.getAppointmentRate = async (req, res) => {
  try {
    const createdAt = parseDateRange(req.query);
    const { center_id } = req.query;

    const match = {};
    if (createdAt) match.createdAt = createdAt;
    if (center_id)
      match.center_id =
        require("mongoose").Types.ObjectId.createFromHexString(center_id);

    const stats = await Appointment.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Use current enum in model
    const breakdown = {
      pending: 0,
      deposited: 0,
      accepted: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      paid: 0,
      canceled: 0,
    };

    let total = 0;
    stats.forEach((s) => {
      if (breakdown.hasOwnProperty(s._id)) breakdown[s._id] = s.count;
      total += s.count;
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "Get appointment rate successfully",
        data: { total, breakdown },
      });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

exports.getDashboardOverview = async (req, res) => {
  try {
    const createdAt = parseDateRange(req.query);
    const { center_id } = req.query;
    const apptMatch = {};
    if (createdAt) apptMatch.createdAt = createdAt;
    if (center_id)
      apptMatch.center_id =
        require("mongoose").Types.ObjectId.createFromHexString(center_id);

    const paymentMatch = { status: "paid" };
    if (createdAt) paymentMatch.createdAt = createdAt;

    const [paymentAgg, paymentRateAgg, appointmentAgg] = await Promise.all([
      Payment.aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        { $match: createdAt ? { createdAt } : {} },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: apptMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const revenue = paymentAgg[0]?.revenue || 0;

    const paymentBreakdown = { pending: 0, paid: 0, cancelled: 0 };
    let paymentTotal = 0;
    paymentRateAgg.forEach((s) => {
      if (paymentBreakdown.hasOwnProperty(s._id))
        paymentBreakdown[s._id] = s.count;
      paymentTotal += s.count;
    });
    const paymentRate =
      paymentTotal > 0 ? paymentBreakdown.paid / paymentTotal : 0;

    const appointmentBreakdown = {
      pending: 0,
      deposited: 0,
      accepted: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      paid: 0,
      canceled: 0,
    };
    let appointmentTotal = 0;
    appointmentAgg.forEach((s) => {
      if (appointmentBreakdown.hasOwnProperty(s._id))
        appointmentBreakdown[s._id] = s.count;
      appointmentTotal += s.count;
    });

    return res.status(200).json({
      success: true,
      message: "Get dashboard overview successfully",
      data: {
        revenue,
        payment: {
          total: paymentTotal,
          rate: paymentRate,
          breakdown: paymentBreakdown,
        },
        appointment: {
          total: appointmentTotal,
          breakdown: appointmentBreakdown,
        },
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};
