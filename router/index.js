const express = require("express");
const router = express.Router();

const userRouter = require("../routes/users");
const serviceRouter = require("../routes/service");
const vehicleRouter = require("../routes/vehicle");
const paymentRouter = require("../routes/payment");

router.use("/users", userRouter);
router.use("/service", serviceRouter);
router.use("/vehicle", vehicleRouter);
router.use("/payment", paymentRouter);

module.exports = router;
