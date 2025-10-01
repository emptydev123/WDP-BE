const express = require('express');
const router = express.Router();

const userRouter = require('../routes/users');
const serviceRouter = require('../routes/service')

router.use('/users', userRouter);
router.use('/service', serviceRouter);
module.exports = router