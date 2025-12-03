// Additional AI endpoint for checklist creation suggestions
const Checklist = require("../model/checklist");
const IssueType = require("../model/issueType");
const Vehicle = require("../model/vehicle");
const Inventory = require("../model/inventory");

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
