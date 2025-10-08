const express = require("express");
const router = express.Router();

const userRouter = require("../routes/users");
const serviceRouter = require("../routes/service");
const vehicleRouter = require("../routes/vehicle");
const paymentRouter = require("../routes/payment");
const appointmentRouter = require("../routes/appointment");
const inventoryRouter = require("../routes/inventory");
const partsRouter = require("../routes/parts");
const serviceCenterRouter = require("../routes/serviceCenter");

router.use("/users", userRouter);
router.use("/service", serviceRouter);
router.use("/vehicle", vehicleRouter);
router.use("/payment", paymentRouter);
router.use("/appointment", appointmentRouter);
router.use("/inventory", inventoryRouter);
router.use("/parts", partsRouter);
router.use("/service-centers", serviceCenterRouter);

module.exports = router;
