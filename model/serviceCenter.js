
const mongoose = require('mongoose');
const schema = mongoose.Schema;
var Technican = require('./technican')
const serviceCenterSchema = new schema(
  {
    center_name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    phone: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    working_hours: {
      type: Object,
      default: {
        monday: { open: '08:00', close: '17:00' },
        tuesday: { open: '08:00', close: '17:00' },
        wednesday: { open: '08:00', close: '17:00' },
        thursday: { open: '08:00', close: '17:00' },
        friday: { open: '08:00', close: '17:00' },
        saturday: { open: '08:00', close: '12:00' },
        sunday: { open: null, close: null }
      }
    },
    // maxSlotsPerDay: {  // Max slots được phục vụ trong 1 ngày
    //   type: Number,
    //   default: 5, // Mặc định là 5 nhân viên mỗi trung tâm
    // },
    slots: { // Số slot hiện tại (tính theo số nhân viên và số khách mỗi nhân viên có thể nhận)
      type: Number,
      default: 0,
    },
    // slots_per_day: { // Mảng lưu số slot mỗi ngày (có thể update khi thêm nhân viên)
    //   type: Map,
    //   of: Number, // Lưu số slot mỗi ngày
    //   default: {}
    // }
    last_reset: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Tính toán số slot tự động khi tạo trung tâm dịch vụ
serviceCenterSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Cập nhật số slot dựa trên số lượng nhân viên
    const employees = await Technican.countDocuments({ center_id: this._id });
    this.slots = employees * 4;
  }
  next();
});

const serviceCenter = mongoose.model("ServiceCenter", serviceCenterSchema);
module.exports = serviceCenter;
