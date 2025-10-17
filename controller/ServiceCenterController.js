var ServiceCenter = require('../model/serviceCenter');
var serviceCenterHours = require('../model/serviceCenterHours');
var Appointment = require('../model/appointment');
const mongoose = require('mongoose')
/**
 * Tạo các trung tâm
 */
exports.createServiceCenter = async (req, res) => {
    try {
        const { center_name, address, phone, email, is_active } = req.body;
        const user_id = req.user._id
        const newServiceCenter = new ServiceCenter({
            center_name,
            address,
            address,
            email,
            is_active: is_active ?? true,
            phone,
            user_id
        })
        await newServiceCenter.save();
        return res.status(201).json({
            message: "Tạo Service Center Thành Công",
            serviceCenter: newServiceCenter,
            success: true,
        })
    } catch (error) {
        res.status(500).json({
            message: "Lỗi r check lại đi",
            error: error.message,
            success: false,
        })
    }
}
// Lịch làm việc của từng trung tâm
exports.createServiceCenterSchedule = async (req, res) => {
    try {
        const { id } = req.params
        const { day_of_week, open_time, close_time, is_close } = req.body
        const checkCenter = await ServiceCenter.findById(id);
        if (!checkCenter) {
            return res.status(404).json({
                success: false,
                messsage: "Không tìm thấy trung tâm"
            })
        }

        const createSchedule = new serviceCenterHours({
            day_of_week,
            open_time,
            close_time,
            is_close,
            center_id: id,
        })
        await createSchedule.save();
        return res.status(202).json({
            success: true,
            message: "Tạo lịch làm việc trung tâm thành công",
            serviceCenterHours: createSchedule,
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: error.message
        })
    }
}

exports.getAllServiceCenters = async (req, res) => {
    try {
        // lấy tất cả trung tâm
        const centers = await ServiceCenter.find()
            .lean();

        // lấy tất cả giờ làm việc
        const hours = await serviceCenterHours.find().lean();

        // gộp lịch vào từng trung tâm
        const result = centers.map(center => {
            const centerHours = hours.filter(h => h.center_id.toString() === center._id.toString());
            return {
                ...center,
                working_hours: centerHours
            };
        });

        return res.status(202).json({
            success: true,
            message: "Danh sách trung tâm và giờ làm việc",
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách trung tâm",
            error: error.message
        });
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

        // Danh sách field được phép update
        const allowedFields = ["center_name", "address", "phone", "email", "is_active"];

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
