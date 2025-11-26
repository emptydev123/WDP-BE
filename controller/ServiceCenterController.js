var Technican = require('../model/technican')
var ServiceCenter = require('../model/serviceCenter');
var ServiceCenterHours = require('../model/serviceCenterHours');
var Appointment = require('../model/appointment');
var User = require('../model/user');
const { createServiceCenterHours } = require('./ServiceCenterHoursController')
const mongoose = require('mongoose');
const { updateSlotsForServiceCenter, getDayOfWeek, checkAndUpdateSlotsForNextWeek } = require('../utils/logicSlots')

exports.createServiceCenter = async (req, res) => {
    try {
        const { center_name, address, phone, user_id, email } = req.body;

        // Kiểm tra nếu trung tâm dịch vụ đã tồn tại
        const existingCenter = await ServiceCenter.findOne({ center_name });
        if (existingCenter) {
            return res.status(400).json({ message: "Service center already exists." });
        }

        // Tạo trung tâm dịch vụ mới
        const serviceCenter = new ServiceCenter({
            center_name,
            address,
            user_id,
            phone,
            email,
        });

        // Lưu trung tâm dịch vụ
        await serviceCenter.save();
        await createServiceCenterHours(serviceCenter._id);
        res.status(201).json(serviceCenter);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateServiceCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Kiểm tra trung tâm có tồn tại không
        const center = await ServiceCenter.findById(id);
        if (!center) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy trung tâm",
            });
        }

        // Nếu trung tâm này đã có lịch hẹn thì không cho update
        const hasAppointment = await Appointment.exists({
            center_id: new mongoose.Types.ObjectId(id),
        });

        if (hasAppointment) {
            return res.status(400).json({
                success: false,
                message: "Không thể cập nhật trung tâm vì đã có lịch hẹn",
            });
        }

        // Danh sách field được phép update (cho phép đổi staff khi chưa có lịch hẹn)
        const allowedFields = ["center_name", "address", "phone", "email", "is_active", "user_id"];

        // Cập nhật chỉ các field hợp lệ
        for (const key of Object.keys(updates)) {
            if (allowedFields.includes(key)) {
                center[key] = updates[key];
            }
        }

        await center.save();

        return res.status(200).json({
            success: true,
            message: "Cập nhật trung tâm thành công",
            data: center,
        });
    } catch (error) {
        console.error(" Lỗi update trung tâm:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật trung tâm",
            error: error.message,
        });
    }
};
exports.deleteServiceCenter = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(" ID nhận được:", id);
        // Kiểm tra trung tâm tồn tại
        const center = await ServiceCenter.findById(id);
        if (!center) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy trung tâm",
            });
        }

        // Kiểm tra trung tâm này có lịch hẹn nào không
        const hasAppointment = await Appointment.exists({
            center_id: new mongoose.Types.ObjectId(id),
        });

        if (hasAppointment) {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa trung tâm vì đã có lịch hẹn",
            });
        }

        // Nếu không có lịch hẹn → xóa luôn các giờ làm việc liên quan
        await serviceCenterHours.deleteMany({ center_id: id });

        // Xóa trung tâm
        await ServiceCenter.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Xóa trung tâm thành công",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server khi xóa trung tâm",
            error: error.message,
        });
    }
};

exports.addTechnicanToServiceCenter = async (req, res) => {
    try {
        const { user_id, center_id } = req.body;

        // Kiểm tra nếu nhân viên đã được thêm vào trung tâm khác
        const existingTechnican = await Technican.findOne({ user_id });
        if (existingTechnican) {
            return res.status(400).json({ message: "Employee already assigned to another center." });
        }

        // Kiểm tra trung tâm có tồn tại không
        const center = await ServiceCenter.findById(center_id);
        if (!center) {
            return res.status(404).json({ message: "Service center not found." });
        }

        // Kiểm tra số lượng nhân viên của trung tâm
        const currentTechnicans = await Technican.find({ center_id });

        if (currentTechnicans.length >= center.maxSlotsPerDay) {
            return res.status(400).json({ message: "Center has reached maximum number of employees." });
        }

        // Thêm nhân viên vào trung tâm
        const technican = new Technican({
            user_id,
            center_id,
            status: 'on',  // Nhân viên đang hoạt động
        });

        await technican.save();

        // Cập nhật số slot của trung tâm (mỗi nhân viên có thể nhận 4 khách)
        const updatedTechnicanCount = currentTechnicans.length + 1;  // Cộng thêm nhân viên mới
        center.slots = updatedTechnicanCount * 4;

        // Cập nhật slot cho từng ngày trong `serviceCenterHours` theo số lượng nhân viên
        await updateSlotsForServiceCenter(center_id, updatedTechnicanCount);

        await center.save();

        res.status(201).json(technican);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.removeTechnicanFromCenter = async (req, res) => {
    try {
        const { user_id, center_id } = req.body;

        // Xóa nhân viên khỏi trung tâm
        const technican = await Technican.findOneAndDelete({ user_id, center_id });
        if (!technican) {
            return res.status(404).json({ message: "Technician not found in this center." });
        }

        // Cập nhật lại số slot của trung tâm
        const center = await ServiceCenter.findById(center_id);
        const currentTechnicans = await Technican.find({ center_id });
        center.slots = currentTechnicans.length * 4;
        await center.save();

        res.status(200).json({ message: "Technician removed from center." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Staff is represented by single user_id on ServiceCenter (one staff per center)
