const express = require('express');
const router = express.Router();

const userRouter = require('../routes/users');
const serviceRouter = require('../routes/service');
const vehicleRouter = require('../routes/vehicle');


router.use('/users', userRouter);
router.use('/service', serviceRouter);
router.use('/vehicle', vehicleRouter)
module.exports = router