var serviceCenter = require('../model/serviceCenter');
var serviceCenterHours = require('../model/serviceCenterHours');
/**
 * Tạo các trung tâm
 */
exports.createServiceCenter = async (req, res) => {
    try {
        const { center_name, address, phone, email, is_active } = req.body;
        const user_id = req.user._id
        const newServiceCenter = new serviceCenter({
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
        const checkCenter = await serviceCenter.findById(id);
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
        const centers = await serviceCenter.find()
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
