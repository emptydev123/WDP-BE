// controller/AIController.js
const Appointment = require("../model/appointment");
const Checklist = require("../model/checklist");
const Inventory = require("../model/inventory");
const Part = require("../model/parts");
const Vehicle = require("../model/vehicle");
const ServiceCenter = require("../model/serviceCenter");
const IssueType = require("../model/issueType");

/**
 * AI Inventory Forecasting
 * Dự đoán nhu cầu phụ tùng dựa trên lịch sử sử dụng
 */
exports.forecastInventoryDemand = async (req, res) => {
  try {
    const { center_id, days_ahead = 30 } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    // Lấy dữ liệu lịch sử 90 ngày gần đây
    const historicalDays = 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historicalDays);

    const query = {
      status: { $in: ["completed", "in_progress"] },
      createdAt: { $gte: startDate },
    };

    if (center_id) {
      query.center_id = center_id;
    }

    // Lấy tất cả appointments trong khoảng thời gian
    const appointments = await Appointment.find(query)
      .select("_id center_id createdAt")
      .lean();

    if (appointments.length === 0) {
      return res.status(200).json({
        message: "Chưa có dữ liệu lịch sử để dự đoán",
        success: true,
        data: {
          forecasts: [],
          summary: {
            total_appointments_analyzed: 0,
            historical_period_days: historicalDays,
            forecast_period_days: parseInt(days_ahead),
          },
        },
      });
    }

    const appointmentIds = appointments.map((a) => a._id);

    // Lấy tất cả checklists với parts đã sử dụng
    const checklists = await Checklist.find({
      appointment_id: { $in: appointmentIds },
      status: { $in: ["accepted", "completed"] },
    })
      .populate("parts.part_id", "part_name part_number description costPrice sellPrice")
      .populate("issue_type_id", "category severity")
      .lean();

    // Phân tích usage patterns
    const partUsageMap = new Map();

    checklists.forEach((checklist) => {
      if (!checklist.parts || checklist.parts.length === 0) return;

      checklist.parts.forEach((partEntry) => {
        const partId = partEntry.part_id._id.toString();
        const quantity = partEntry.quantity || 1;

        if (!partUsageMap.has(partId)) {
          partUsageMap.set(partId, {
            part_id: partId,
            part_info: partEntry.part_id,
            total_used: 0,
            usage_count: 0,
            issue_categories: new Set(),
            centers: new Set(),
          });
        }

        const data = partUsageMap.get(partId);
        data.total_used += quantity;
        data.usage_count += 1;

        if (checklist.issue_type_id?.category) {
          data.issue_categories.add(checklist.issue_type_id.category);
        }

        // Tìm center_id từ appointment
        const apt = appointments.find(
          (a) => a._id.toString() === checklist.appointment_id.toString()
        );
        if (apt?.center_id) {
          data.centers.add(apt.center_id.toString());
        }
      });
    });

    // Tính toán forecast cho từng part
    const forecasts = [];
    const daysAheadNum = parseInt(days_ahead);

    for (const [partId, usage] of partUsageMap) {
      // Tính average usage per day
      const avgUsagePerDay = usage.total_used / historicalDays;
      const predictedUsage = Math.ceil(avgUsagePerDay * daysAheadNum);

      // Tính confidence score dựa trên consistency
      const usageFrequency = usage.usage_count / appointments.length;
      const confidence = Math.min(usageFrequency * 100, 100);

      // Lấy current inventory cho part này
      let currentInventories = [];
      if (center_id) {
        currentInventories = await Inventory.find({
          part_id: partId,
          center_id: center_id,
        })
          .populate("center_id", "center_name")
          .lean();
      } else {
        // Nếu không chỉ định center, lấy tất cả centers có sử dụng part này
        const centerIds = Array.from(usage.centers);
        currentInventories = await Inventory.find({
          part_id: partId,
          center_id: { $in: centerIds },
        })
          .populate("center_id", "center_name")
          .lean();
      }

      // Tính recommendation cho từng center
      const recommendations = currentInventories.map((inv) => {
        const currentStock = inv.quantity_avaiable || 0;
        const minimumStock = inv.minimum_stock || 0;
        const needsRestock =
          currentStock < predictedUsage + minimumStock;

        const recommendedOrder = needsRestock
          ? Math.max(0, predictedUsage + minimumStock - currentStock)
          : 0;

        return {
          center_id: inv.center_id._id,
          center_name: inv.center_id.center_name,
          current_stock: currentStock,
          minimum_stock: minimumStock,
          predicted_usage: predictedUsage,
          recommended_order: recommendedOrder,
          needs_restock: needsRestock,
          urgency: currentStock < minimumStock ? "high" : needsRestock ? "medium" : "low",
        };
      });

      forecasts.push({
        part_id: partId,
        part_name: usage.part_info.part_name,
        part_number: usage.part_info.part_number,
        description: usage.part_info.description,
        cost_price: usage.part_info.costPrice,
        sell_price: usage.part_info.sellPrice,
        statistics: {
          total_used_in_period: usage.total_used,
          usage_frequency: usage.usage_count,
          avg_usage_per_day: parseFloat(avgUsagePerDay.toFixed(2)),
          confidence_score: parseFloat(confidence.toFixed(2)),
          related_issue_categories: Array.from(usage.issue_categories),
        },
        prediction: {
          forecast_period_days: daysAheadNum,
          predicted_usage: predictedUsage,
        },
        recommendations: recommendations,
      });
    }

    // Sort by urgency and predicted usage
    forecasts.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      const aMaxUrgency = Math.min(
        ...a.recommendations.map((r) => urgencyOrder[r.urgency] ?? 3)
      );
      const bMaxUrgency = Math.min(
        ...b.recommendations.map((r) => urgencyOrder[r.urgency] ?? 3)
      );

      if (aMaxUrgency !== bMaxUrgency) {
        return aMaxUrgency - bMaxUrgency;
      }

      return b.prediction.predicted_usage - a.prediction.predicted_usage;
    });

    return res.status(200).json({
      message: "Dự đoán nhu cầu phụ tùng thành công",
      success: true,
      data: {
        forecasts: forecasts,
        summary: {
          total_appointments_analyzed: appointments.length,
          total_checklists_analyzed: checklists.length,
          total_parts_tracked: forecasts.length,
          historical_period_days: historicalDays,
          forecast_period_days: daysAheadNum,
          high_priority_items: forecasts.filter((f) =>
            f.recommendations.some((r) => r.urgency === "high")
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Forecast inventory demand error:", error);
    return res.status(500).json({
      message: "Lỗi khi dự đoán nhu cầu phụ tùng",
      error: error.message,
      success: false,
    });
  }
};

/**
 * AI Parts Recommendation for Checklist
 * Gợi ý phụ tùng cần thay dựa trên issue type và vehicle info
 */
exports.recommendPartsForIssue = async (req, res) => {
  try {
    const { issue_type_id, vehicle_id, center_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!issue_type_id) {
      return res.status(400).json({
        message: "Thiếu issue_type_id",
        success: false,
      });
    }

    // Lấy thông tin issue type
    const issueType = await IssueType.findById(issue_type_id).lean();
    if (!issueType) {
      return res.status(404).json({
        message: "Không tìm thấy issue type",
        success: false,
      });
    }

    // Lấy thông tin vehicle nếu có
    let vehicleInfo = null;
    if (vehicle_id) {
      vehicleInfo = await Vehicle.findById(vehicle_id)
        .populate("model_id")
        .lean();
    }

    // Tìm các checklists tương tự trong quá khứ
    const similarChecklists = await Checklist.find({
      issue_type_id: issue_type_id,
      status: { $in: ["accepted", "completed"] },
    })
      .populate("parts.part_id")
      .limit(50)
      .lean();

    // Phân tích parts được sử dụng nhiều nhất
    const partFrequency = new Map();

    similarChecklists.forEach((checklist) => {
      if (!checklist.parts || checklist.parts.length === 0) return;

      checklist.parts.forEach((partEntry) => {
        if (!partEntry.part_id) return;

        const partId = partEntry.part_id._id.toString();
        const quantity = partEntry.quantity || 1;

        if (!partFrequency.has(partId)) {
          partFrequency.set(partId, {
            part_info: partEntry.part_id,
            frequency: 0,
            total_quantity: 0,
            avg_quantity: 0,
          });
        }

        const data = partFrequency.get(partId);
        data.frequency += 1;
        data.total_quantity += quantity;
      });
    });

    // Tính average quantity và confidence score
    const recommendations = [];
    for (const [partId, data] of partFrequency) {
      const avgQuantity = data.total_quantity / data.frequency;
      const confidence =
        (data.frequency / Math.max(similarChecklists.length, 1)) * 100;

      // Check availability in inventory
      let availability = null;
      if (center_id) {
        const inventory = await Inventory.findOne({
          part_id: partId,
          center_id: center_id,
        })
          .populate("center_id", "center_name")
          .lean();

        if (inventory) {
          availability = {
            center_name: inventory.center_id.center_name,
            quantity_available: inventory.quantity_avaiable,
            minimum_stock: inventory.minimum_stock,
            is_available: inventory.quantity_avaiable >= Math.ceil(avgQuantity),
          };
        }
      }

      recommendations.push({
        part_id: partId,
        part_name: data.part_info.part_name,
        part_number: data.part_info.part_number,
        description: data.part_info.description,
        cost_price: data.part_info.costPrice,
        sell_price: data.part_info.sellPrice,
        warranty_months: data.part_info.warranty_month,
        recommended_quantity: Math.ceil(avgQuantity),
        confidence_score: parseFloat(confidence.toFixed(2)),
        usage_frequency: data.frequency,
        total_cases_analyzed: similarChecklists.length,
        availability: availability,
      });
    }

    // Sort by confidence score
    recommendations.sort((a, b) => b.confidence_score - a.confidence_score);

    return res.status(200).json({
      message: "Gợi ý phụ tùng thành công",
      success: true,
      data: {
        issue_type: {
          _id: issueType._id,
          category: issueType.category,
          severity: issueType.severity,
        },
        vehicle_info: vehicleInfo
          ? {
              model: vehicleInfo.model_id?.model_name,
              year: vehicleInfo.model_id?.year,
              current_mileage: vehicleInfo.current_miliage,
            }
          : null,
        recommendations: recommendations,
        summary: {
          total_similar_cases: similarChecklists.length,
          total_parts_recommended: recommendations.length,
        },
      },
    });
  } catch (error) {
    console.error("Recommend parts for issue error:", error);
    return res.status(500).json({
      message: "Lỗi khi gợi ý phụ tùng",
      error: error.message,
      success: false,
    });
  }
};

/**
 * AI Issue Trend Analysis
 * Phân tích xu hướng sự cố theo vehicle model, issue type
 */
exports.analyzeIssueTrends = async (req, res) => {
  try {
    const { center_id, days = 90, vehicle_model_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const daysNum = parseInt(days);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Query appointments
    const query = {
      status: { $in: ["completed", "in_progress", "assigned"] },
      createdAt: { $gte: startDate },
    };

    if (center_id) {
      query.center_id = center_id;
    }

    const appointments = await Appointment.find(query)
      .populate("vehicle_id")
      .select("_id vehicle_id createdAt center_id")
      .lean();

    if (appointments.length === 0) {
      return res.status(200).json({
        message: "Chưa có dữ liệu để phân tích",
        success: true,
        data: {
          trends: [],
          summary: { total_appointments_analyzed: 0 },
        },
      });
    }

    const appointmentIds = appointments.map((a) => a._id);

    // Get all checklists with issue types
    const checklists = await Checklist.find({
      appointment_id: { $in: appointmentIds },
    })
      .populate("issue_type_id")
      .populate("appointment_id", "vehicle_id")
      .lean();

    // Analyze issue type frequency
    const issueTypeMap = new Map();

    for (const checklist of checklists) {
      if (!checklist.issue_type_id) continue;

      const issueTypeId = checklist.issue_type_id._id.toString();
      const category = checklist.issue_type_id.category;
      const severity = checklist.issue_type_id.severity;

      // Find appointment to get vehicle info
      const appointment = appointments.find(
        (a) => a._id.toString() === checklist.appointment_id._id.toString()
      );

      if (!issueTypeMap.has(issueTypeId)) {
        issueTypeMap.set(issueTypeId, {
          issue_type_id: issueTypeId,
          category: category,
          severity: severity,
          frequency: 0,
          vehicle_models: new Map(),
          total_cost: 0,
        });
      }

      const data = issueTypeMap.get(issueTypeId);
      data.frequency += 1;
      data.total_cost += checklist.total_cost || 0;

      // Track vehicle model
      if (appointment?.vehicle_id?.model_id) {
        const modelId = appointment.vehicle_id.model_id.toString();
        const currentCount = data.vehicle_models.get(modelId) || 0;
        data.vehicle_models.set(modelId, currentCount + 1);
      }
    }

    // Build trends array
    const trends = [];
    for (const [issueTypeId, data] of issueTypeMap) {
      const avgCost = data.frequency > 0 ? data.total_cost / data.frequency : 0;

      // Convert vehicle models map to array
      const affectedModels = [];
      for (const [modelId, count] of data.vehicle_models) {
        affectedModels.push({
          model_id: modelId,
          occurrence_count: count,
        });
      }

      // Sort models by occurrence
      affectedModels.sort((a, b) => b.occurrence_count - a.occurrence_count);

      trends.push({
        issue_type_id: issueTypeId,
        category: data.category,
        severity: data.severity,
        frequency: data.frequency,
        percentage: parseFloat(
          ((data.frequency / checklists.length) * 100).toFixed(2)
        ),
        avg_cost: parseFloat(avgCost.toFixed(2)),
        total_cost: data.total_cost,
        affected_vehicle_models: affectedModels,
        trend_indicator:
          data.frequency > checklists.length * 0.15
            ? "high"
            : data.frequency > checklists.length * 0.05
            ? "medium"
            : "low",
      });
    }

    // Sort by frequency
    trends.sort((a, b) => b.frequency - a.frequency);

    return res.status(200).json({
      message: "Phân tích xu hướng sự cố thành công",
      success: true,
      data: {
        trends: trends,
        summary: {
          total_appointments_analyzed: appointments.length,
          total_checklists_analyzed: checklists.length,
          analysis_period_days: daysNum,
          unique_issue_types: trends.length,
          high_frequency_issues: trends.filter((t) => t.trend_indicator === "high")
            .length,
        },
      },
    });
  } catch (error) {
    console.error("Analyze issue trends error:", error);
    return res.status(500).json({
      message: "Lỗi khi phân tích xu hướng sự cố",
      error: error.message,
      success: false,
    });
  }
};

/**
 * AI Checklist Suggestions
 * Gợi ý giải pháp, mô tả vấn đề, và phụ tùng dựa trên issue type + lịch sử sửa chữa
 */
exports.getChecklistSuggestions = async (req, res) => {
  try {
    const { issue_type_id, vehicle_id, center_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    if (!issue_type_id) {
      return res.status(400).json({
        message: "Thiếu issue_type_id",
        success: false,
      });
    }

    // Lấy thông tin issue type
    const issueType = await IssueType.findById(issue_type_id).lean();
    if (!issueType) {
      return res.status(404).json({
        message: "Không tìm thấy issue type",
        success: false,
      });
    }

    // Lấy thông tin vehicle nếu có
    let vehicleInfo = null;
    if (vehicle_id) {
      vehicleInfo = await Vehicle.findById(vehicle_id)
        .populate("model_id")
        .lean();
    }

    // Tìm các checklists tương tự đã completed trong quá khứ (sorted by newest first)
    const similarChecklists = await Checklist.find({
      issue_type_id: issue_type_id,
      status: { $in: ["accepted", "completed"] },
    })
      .populate("parts.part_id")
      .populate("appointment_id", "vehicle_id")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // 1. Phân tích solutions phổ biến nhất
    const solutionFrequency = new Map();
    similarChecklists.forEach((checklist) => {
      const solution = checklist.solution_applied || "";
      if (solution.trim()) {
        const count = solutionFrequency.get(solution) || 0;
        solutionFrequency.set(solution, count + 1);
      }
    });

    const solutionSuggestions = [];
    for (const [solution, count] of solutionFrequency) {
      solutionSuggestions.push({
        solution: solution,
        frequency: count,
        confidence: parseFloat(
          ((count / similarChecklists.length) * 100).toFixed(2)
        ),
      });
    }
    solutionSuggestions.sort((a, b) => b.frequency - a.frequency);

    // 2. Phân tích descriptions phổ biến nhất
    const descriptionFrequency = new Map();
    similarChecklists.forEach((checklist) => {
      const desc = checklist.issue_description || "";
      if (desc.trim() && desc.trim().length > 10) {
        const count = descriptionFrequency.get(desc) || 0;
        descriptionFrequency.set(desc, count + 1);
      }
    });

    const descriptionSuggestions = [];
    for (const [description, count] of descriptionFrequency) {
      descriptionSuggestions.push({
        description: description,
        frequency: count,
        confidence: parseFloat(
          ((count / similarChecklists.length) * 100).toFixed(2)
        ),
      });
    }
    descriptionSuggestions.sort((a, b) => b.frequency - a.frequency);

    // 3. Phân tích parts được sử dụng nhiều nhất
    const partFrequency = new Map();

    similarChecklists.forEach((checklist) => {
      if (!checklist.parts || checklist.parts.length === 0) return;

      checklist.parts.forEach((partEntry) => {
        if (!partEntry.part_id) return;

        const partId = partEntry.part_id._id.toString();
        const quantity = partEntry.quantity || 1;

        if (!partFrequency.has(partId)) {
          partFrequency.set(partId, {
            part_info: partEntry.part_id,
            frequency: 0,
            total_quantity: 0,
          });
        }

        const data = partFrequency.get(partId);
        data.frequency += 1;
        data.total_quantity += quantity;
      });
    });

    // Build parts recommendations with inventory check
    const partRecommendations = [];
    for (const [partId, data] of partFrequency) {
      const avgQuantity = data.total_quantity / data.frequency;
      const confidence =
        (data.frequency / Math.max(similarChecklists.length, 1)) * 100;

      // Check availability in inventory
      let availability = null;
      if (center_id) {
        const inventory = await Inventory.findOne({
          part_id: partId,
          center_id: center_id,
        })
          .populate("center_id", "center_name")
          .lean();

        if (inventory) {
          availability = {
            center_name: inventory.center_id.center_name,
            quantity_available: inventory.quantity_avaiable,
            minimum_stock: inventory.minimum_stock,
            is_available: inventory.quantity_avaiable >= Math.ceil(avgQuantity),
          };
        }
      }

      partRecommendations.push({
        part_id: partId,
        part_name: data.part_info.part_name,
        part_number: data.part_info.part_number,
        description: data.part_info.description,
        cost_price: data.part_info.costPrice,
        sell_price: data.part_info.sellPrice,
        warranty_months: data.part_info.warranty_month,
        recommended_quantity: Math.ceil(avgQuantity),
        confidence_score: parseFloat(confidence.toFixed(2)),
        usage_frequency: data.frequency,
        availability: availability,
      });
    }

    // Sort parts by confidence score
    partRecommendations.sort((a, b) => b.confidence_score - a.confidence_score);

    // 4. Lấy checklist gần nhất đã hoàn thành để reference (nếu có)
    const mostRecentSuccess =
      similarChecklists.length > 0 ? similarChecklists[0] : null;

    return res.status(200).json({
      message: "Lấy gợi ý checklist thành công",
      success: true,
      data: {
        issue_type: {
          _id: issueType._id,
          category: issueType.category,
          severity: issueType.severity,
        },
        vehicle_info: vehicleInfo
          ? {
              model: vehicleInfo.model_id?.model_name,
              brand: vehicleInfo.model_id?.brand,
              year: vehicleInfo.model_id?.year,
              current_mileage: vehicleInfo.current_miliage,
            }
          : null,
        solution_suggestions: solutionSuggestions.slice(0, 3), // Top 3
        description_suggestions: descriptionSuggestions.slice(0, 3), // Top 3
        part_recommendations: partRecommendations,
        most_recent_success: mostRecentSuccess
          ? {
              solution: mostRecentSuccess.solution_applied,
              description: mostRecentSuccess.issue_description,
              parts: mostRecentSuccess.parts?.map((p) => ({
                part_name: p.part_id?.part_name,
                quantity: p.quantity,
              })),
              total_cost: mostRecentSuccess.total_cost,
              created_at: mostRecentSuccess.createdAt,
            }
          : null,
        summary: {
          total_similar_cases: similarChecklists.length,
          solution_variations: solutionSuggestions.length,
          description_variations: descriptionSuggestions.length,
          parts_recommended: partRecommendations.length,
        },
      },
    });
  } catch (error) {
    console.error("Get checklist suggestions error:", error);
    return res.status(500).json({
      message: "Lỗi khi lấy gợi ý checklist",
      error: error.message,
      success: false,
    });
  }
};

/**
 * AI Inventory Optimization Suggestions
 * Đề xuất tối ưu hóa inventory dựa trên multiple factors
 */
exports.getInventoryOptimizationSuggestions = async (req, res) => {
  try {
    const { center_id } = req.query;
    const userId = req._id?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const query = {};
    if (center_id) {
      query.center_id = center_id;
    }

    // Get all inventory items
    const inventoryItems = await Inventory.find(query)
      .populate("part_id")
      .populate("center_id", "center_name")
      .lean();

    const suggestions = [];

    for (const item of inventoryItems) {
      const partId = item.part_id._id.toString();
      const currentStock = item.quantity_avaiable || 0;
      const minimumStock = item.minimum_stock || 0;

      // Analyze historical usage (last 60 days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const appointments = await Appointment.find({
        center_id: item.center_id._id,
        status: { $in: ["completed", "in_progress"] },
        createdAt: { $gte: sixtyDaysAgo },
      }).select("_id");

      const checklists = await Checklist.find({
        appointment_id: { $in: appointments.map((a) => a._id) },
        "parts.part_id": partId,
        status: { $in: ["accepted", "completed"] },
      }).lean();

      let totalUsed = 0;
      checklists.forEach((checklist) => {
        const partEntry = checklist.parts?.find(
          (p) => p.part_id.toString() === partId
        );
        if (partEntry) {
          totalUsed += partEntry.quantity || 0;
        }
      });

      const avgUsagePerMonth = (totalUsed / 60) * 30;

      // Generate suggestion
      let suggestionType = "optimal";
      let message = "";
      let recommendedAction = "";
      let priority = "low";

      if (currentStock < minimumStock) {
        suggestionType = "critical_low";
        message = `Tồn kho hiện tại (${currentStock}) thấp hơn mức tối thiểu (${minimumStock})`;
        recommendedAction = `Nhập kho ngay ${Math.ceil(
          avgUsagePerMonth * 2 - currentStock
        )} đơn vị`;
        priority = "high";
      } else if (currentStock < minimumStock + avgUsagePerMonth) {
        suggestionType = "low_stock";
        message = `Tồn kho sắp dưới mức tối thiểu trong vòng 30 ngày`;
        recommendedAction = `Cân nhắc nhập thêm ${Math.ceil(
          avgUsagePerMonth
        )} đơn vị`;
        priority = "medium";
      } else if (currentStock > avgUsagePerMonth * 6) {
        suggestionType = "overstock";
        message = `Tồn kho hiện tại cao hơn mức sử dụng 6 tháng`;
        recommendedAction = `Giảm đặt hàng trong kỳ tới hoặc chuyển sang trung tâm khác`;
        priority = "low";
      } else if (totalUsed === 0 && currentStock > 0) {
        suggestionType = "no_usage";
        message = `Không có lịch sử sử dụng trong 60 ngày qua`;
        recommendedAction = `Xem xét giảm tồn kho hoặc loại bỏ khỏi danh mục`;
        priority = "low";
      }

      if (suggestionType !== "optimal") {
        suggestions.push({
          inventory_id: item._id,
          part_id: partId,
          part_name: item.part_id.part_name,
          part_number: item.part_id.part_number,
          center_name: item.center_id.center_name,
          current_stock: currentStock,
          minimum_stock: minimumStock,
          avg_monthly_usage: parseFloat(avgUsagePerMonth.toFixed(2)),
          total_used_60days: totalUsed,
          suggestion_type: suggestionType,
          message: message,
          recommended_action: recommendedAction,
          priority: priority,
          estimated_cost_impact: item.part_id.costPrice
            ? parseFloat(
                (Math.abs(currentStock - avgUsagePerMonth * 3) *
                  item.part_id.costPrice).toFixed(2)
              )
            : null,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort(
      (a, b) =>
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        b.current_stock - a.current_stock
    );

    return res.status(200).json({
      message: "Lấy đề xuất tối ưu hóa inventory thành công",
      success: true,
      data: {
        suggestions: suggestions,
        summary: {
          total_items_analyzed: inventoryItems.length,
          total_suggestions: suggestions.length,
          high_priority: suggestions.filter((s) => s.priority === "high").length,
          medium_priority: suggestions.filter((s) => s.priority === "medium")
            .length,
          low_priority: suggestions.filter((s) => s.priority === "low").length,
        },
      },
    });
  } catch (error) {
    console.error("Get inventory optimization suggestions error:", error);
    return res.status(500).json({
      message: "Lỗi khi lấy đề xuất tối ưu hóa inventory",
      error: error.message,
      success: false,
    });
  }
};
