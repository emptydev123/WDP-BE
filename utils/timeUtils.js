exports.parseDurationToMs = (s) => {
  if (!s) return 0;
  const str = String(s).trim().toLowerCase();
  const hMatch = str.match(/(\d+(\.\d+)?)\s*h/);
  const mMatch = str.match(/(\d+)\s*m/);
  if (hMatch) {
    const hours = parseFloat(hMatch[1]);
    const minAfterH = str.match(/h\s*(\d+)\s*m/);
    let mins = 0;
    if (minAfterH) mins = parseInt(minAfterH[1], 10);
    return (hours * 60 + mins) * 60 * 1000;
  }
  if (mMatch) return parseInt(mMatch[1], 10) * 60 * 1000;

  const colon = str.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    const h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    return (h * 60 + m) * 60 * 1000;
  }
  const num = parseFloat(str.replace(",", "."));
  if (!isNaN(num)) {
    if (num > 0 && num <= 24) return num * 60 * 60 * 1000;
    return num * 60 * 1000;
  }
  return 0;
};

exports.buildLocalDateTime = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = timeStr.split(":").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
};

/**
 * Convert time string sang phút
 * @param {string} time - "09:00"
 * @returns {number} Tổng số phút từ 00:00
 */
exports.timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Tính thời gian kết thúc từ thời gian bắt đầu và duration
 * @param {string} startTime - "09:00"
 * @param {number} durationHours - 2 (giờ)
 * @returns {string} "11:00"
 */
exports.calculateEndTime = (startTime, durationHours) => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const durationMinutes = durationHours * 60;
  const endMinutes = startMinutes + durationMinutes;

  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;

  return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(
    2,
    "0"
  )}`;
};

/**
 * Check xem 2 khoảng thời gian có overlap không
 * @param {string} start1 - "09:00"
 * @param {string} end1 - "11:00"
 * @param {string} start2 - "10:00"
 * @param {string} end2 - "12:00"
 * @returns {boolean} true nếu overlap
 */
exports.checkTimeOverlap = (start1, end1, start2, end2) => {
  const s1 = exports.timeToMinutes(start1);
  const e1 = exports.timeToMinutes(end1);
  const s2 = exports.timeToMinutes(start2);
  const e2 = exports.timeToMinutes(end2);

  // Overlap: (s1 < e2) && (e1 > s2)
  return s1 < e2 && e1 > s2;
};

/**
 * Thêm buffer (giờ) vào thời gian
 * @param {string} time - "09:30"
 * @param {number} bufferHours - 1 (giờ)
 * @returns {string} "10:30"
 */
exports.addBufferToTime = (time, bufferHours) => {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + bufferHours * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
};

/**
 * Lấy thời gian hiện tại dạng HH:mm
 * @returns {string} "09:45"
 */
exports.getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
};

/**
 * Check xem ngày có phải là quá khứ không
 * @param {Date} date - Date object
 * @returns {boolean} true nếu là quá khứ
 */
exports.isPastDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};
