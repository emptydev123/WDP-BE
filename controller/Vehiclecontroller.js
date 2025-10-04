var Vehicle = require('../model/vehicle');
var VehicleModel = require('../model/vehicleModel')
// Create Vehicle Model
exports.createVehicleModel = async (req, res) => {
    try {
        // khoảng thời gian bảo trì KM, bảo trì theo tháng 
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