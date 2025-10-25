var Vehicle = require('../model/vehicle');
var VehicleModel = require('../model/vehicleModel')
var Appointment = require('../model/appointment')
const mongoose = require('mongoose')
const { createMaintenanceReminderForVehicle } = require("../utils/reminder")
// Create Vehicle Model
exports.createVehicleModel = async (req, res) => {
    try {
        const { brand, model_name, year, battery_type, maintenanceIntervalKm, maintenanceIntervaMonths } = req.body;
        const newModel = new VehicleModel({
            brand,
            model_name,
            year,
            battery_type,
            maintenanceIntervalKm,
            maintenanceIntervaMonths,
        });

        await newModel.save();

        return res.status(201).json({
            success: true,
            message: "Tạo vehicle model thành công",
            data: newModel
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
    }
};
exports.createVehicle = async (req, res) => {
    try {
        const { license_plate, color, purchase_date, current_miliage, battery_health, last_service_mileage, model_id } = req.body;
        const user_id = req.user._id; // middleware auth gắn vào req.user

        // check model có tồn tại không
        const modelExists = await VehicleModel.findById(model_id);
        if (!modelExists) {
            return res.status(404).json({
                success: false,
                message: "Vehicle model không tồn tại"
            });
        }

        const newVehicle = new Vehicle({
            license_plate,
            color,
            purchase_date,
            current_miliage,
            battery_health,
            last_service_mileage,
            model_id,
            user_id
        });

        await newVehicle.save();
        //  Tạo reminder sau khi tạo xe
        await createMaintenanceReminderForVehicle(newVehicle)

        return res.status(201).json({
            success: true,
            message: "Tạo vehicle thành công",
            data: newVehicle
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: err.message
        });
    }
};

// get all vehicle model
exports.getVehicleModels = async (req, res) => {
    try {
        const models = await VehicleModel.find();
        res.status(200).json({
            success: true,
            message: "Danh sách vehicle model",
            data: models
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
    }
};

// get vehicle theo user
exports.getUserVehicle = async (req, res) => {
    try {
        const user_id = req.user._id
        const vehicles = await Vehicle.find({ user_id }).populate("model_id")

        if (!vehicles || vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User này chưa có vehicle nào",
                data: []
            });
        }

        if (!vehicles || vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User này chưa có vehicle nào",
                data: []
            });
        }

        return res.status(201).json({
            success: true,
            message: "Get data successfully",
            data: vehicles
        })

    } catch (error) {
        res.status(500).json({
            message: "Lỗi server",
            error: error.message,
            success: false
        })
    }
}
// get all vehicle 
exports.getAllVehicle = async (req, res) => {
    try {
        const vehicles = await Vehicle.find().populate("model_id").populate("user_id");

        if (!vehicles || vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không có vehicle nào trong hệ thống",
                data: []
            });
        }
        return res.status(201).json({
            success: true,
            message: "Danh sách tất cả vehicle",
            data: vehicles
        });
    } catch (err) {
        res.status(500).json({
            message: "Lỗi server",
            error: err.message,
            success: false
        })
    }
}
// update vehicle
exports.updateVehicle = async (req, res) => {
    try {
        const vehicle_id = req.params.id;
        const user_id = req.user._id;

        // 1️ Lọc field hợp lệ
        const allowedFields = [
            "color",
            "current_miliage",
            "battery_health",
            "last_service_mileage",
            "purchase_date"
        ];
        const updateData = {};
        for (let key of allowedFields) {
            if (req.body[key] !== undefined) {
                updateData[key] = req.body[key];
            }
        }
        // convert
        const userObjectId = new mongoose.Types.ObjectId(user_id);
        const vehicleObjectId = new mongoose.Types.ObjectId(vehicle_id);

        console.log("userObjectId:", userObjectId);
        console.log("vehicleObjectId:", vehicleObjectId);

        // Check xe có thuộc user không
        const vehicle = await Vehicle.findOne({
            _id: vehicleObjectId,
            user_id: userObjectId
        });

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle không tồn tại hoặc không thuộc về user này",
            });
        }

        // 3 Check appointment pending
        const pendingAppointment = await Appointment.findOne({
            vehicle_id,
            status: { $in: ['pending', 'deposited', 'accepted', 'in_progress'] }
        });
        if (pendingAppointment) {
            return res.status(400).json({
                success: false,
                message: "Không thể cập nhật xe khi đang có lịch hẹn pending",
            });
        }

        // 4️ Update
        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            vehicle_id,
            updateData,
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật vehicle thành công",
            data: updatedVehicle,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: err.message,
        });
    }
};
// delete vehicle
exports.deleteVehicle = async (req, res) => {
    try {
        const vehicle_id = req.params.id;
        const user_id = req.user._id;

        console.log("req.params.id:", vehicle_id);
        console.log("req.user._id:", user_id);

        // Convert sang ObjectId cho chắc
        const userObjectId = new mongoose.Types.ObjectId(user_id);
        const vehicleObjectId = new mongoose.Types.ObjectId(vehicle_id);

        //  Kiểm tra xe có thuộc user không
        const vehicle = await Vehicle.findOne({
            _id: vehicleObjectId,
            user_id: userObjectId
        });

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle không tồn tại hoặc không thuộc về user này",
            });
        }

        // 2️ Kiểm tra có appointment đang pending không
        const pendingAppointment = await Appointment.findOne({
            vehicle_id: vehicleObjectId,
            status: { $in: ['pending', 'deposited', 'accepted', 'in_progress'] }
        });

        if (pendingAppointment) {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa xe khi đang có lịch hẹn đang hoạt động",
            });
        }

        // Tiến hành xóa
        await Vehicle.findByIdAndDelete(vehicleObjectId);

        return res.status(200).json({
            success: true,
            message: "Xóa vehicle thành công",
        });
    } catch (err) {
        console.error("Lỗi khi xóa vehicle:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: err.message,
        });
    }
};
