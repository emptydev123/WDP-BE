var servicePackage = require("../model/servicePackage");
var serviceType = require("../model/serviceType");
var serviceCenterHours = require("../model/serviceCenterHours");

// Role Staff, Admin
exports.createService = async (req, res) => {
  try {
    const {
      service_name,
      description,
      base_price,
      is_active,
      estimated_duration,
    } = req.body;
    const newService = new serviceType({
      service_name,
      description,
      base_price,
      is_active: is_active ?? true,
      estimated_duration,
    });
    await newService.save();
    return res.status(201).json({
      message: "Tạo dịch vụ thành công",
      service: newService,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi r check lại",
      error: error.message,
      success: false,
    });
  }
};
// All Role
exports.getService = async (req, res) => {
  try {
    const services = await serviceType.find({ is_active: true });
    return res.status(202).json({
      message: "Get Services",
      success: true,
      data: services,
    });
  } catch (error) {
    res.status(500).json({
      message: "Không thể lấy list services",
      error: error.message,
      success: false,
    });
  }
};
// Update Service
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const {
      service_name,
      description,
      base_price,
      is_active,
      estimated_duration,
    } = req.body;
    const updatedService = await serviceType.findByIdAndUpdate(
      id,
      {
        service_name,
        description,
        base_price,
        is_active,
        estimated_duration,
      },
      { new: true }
    );
    if (!updatedService) {
      return res.status(404).json({
        message: "Không tìm thấy dịch vụ",
        success: false,
      });
    }
    return res.status(201).json({
      success: true,
      message: "Update dịch vụ thành công",
      data: updatedService,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật dịch vụ",
      error: error.message,
    });
  }
};
/**
 * Xóa dịch vụ theo ID
 * note hiện tại xóa đc mốt update thêm nếu dịch vụ đó đang đc xài thì k đc xóa delete theo status
 */
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("1", id);
    const deleteService = await serviceType.findByIdAndDelete(id);
    if (!deleteService) {
      return res.status(404).json({
        success: false,
        messsage: "Không tìm thấy dịch vụ",
      });
    }
    return res.status(202).json({
      success: true,
      message: "Xóa  dịch vụ thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật dịch vụ",
      error: error.message,
    });
  }
};
