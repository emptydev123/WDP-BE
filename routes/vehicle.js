var vehicle = require('../controller/Vehiclecontroller');
var express = require('express');
var router = express.Router();
const auth = require('../middlewares/auth');

router.post("/createModel",
    auth.authMiddleWare,
    auth.requireRole('customer', 'admin', 'staff'),
    vehicle.createVehicleModel)
router.get("/get",
    auth.authMiddleWare,
    vehicle.getVehicleModels
)
router.post('/createVehicle', auth.authMiddleWare,
    auth.requireRole('customer'),
    vehicle.createVehicle
)
router.get("/getVehicleUser", auth.authMiddleWare,
    auth.requireRole('customer',),
    vehicle.getUserVehicle
)
router.get("/getAllVehicleUser", auth.authMiddleWare,
    auth.requireRole("admin", "staff"),
    vehicle.getAllVehicle
)
module.exports = router