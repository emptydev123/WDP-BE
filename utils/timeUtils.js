
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
