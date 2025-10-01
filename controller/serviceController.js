var servicePackage = require('../model/servicePackage');
var serviceType = require('../model/serviceType');
var serviceCenterHours = require('../model/serviceCenterHours');
var serviceRecords = require('../model/serviceRecords');

// Role Staff, Admin
exports.createService = async (req, res) => {
    try {
        const { service_name, description, base_price, is_active, estimated_duration } = req.body
        const newService = new serviceType({
            service_name,
            description,
            base_price,
            is_active: is_active ?? true,
            estimated_duration
        })
        await newService.save();
        return res.status(201).json({
            message: "Tạo dịch vụ thành công",
            service: newService,
            success: true
        })
    } catch (error) {
        res.status(500).json({
            message: "Lỗi r check lại",
            error: error.message,
            success: false,
        })
    }
}
// All Role
exports.getService = async (req, res) => {
    try {
        const services = await serviceType.find({ is_active: true });
        return res.status(202).json({
            message: "Get Services",
            success: true,
            data: services
        })
    } catch (error) {
        res.status(500).json({
            message: "Không thể lấy list services",
            error: error.message,
            success: false
        })
    }
}