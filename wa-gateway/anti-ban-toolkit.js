/**
 * Anti-Ban Toolkit untuk WhatsApp Gateway
 */

// 1. GAUSSIAN JITTER
function gaussianRandom(min, max, skew = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5;
    if (num > 1 || num < 0) return gaussianRandom(min, max, skew);
    num = Math.pow(num, skew);
    num *= max - min;
    num += min;
    return Math.floor(num);
}

async function gaussianDelay(minMs = 2000, maxMs = 7000) {
    const ms = gaussianRandom(minMs, maxMs);
    return new Promise(resolve => setTimeout(() => resolve(ms), ms));
}

// 2. MESSAGE VARIATOR (Zero-Width Characters)
function variateMessage(text) {
    const zw = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
    const count = Math.floor(Math.random() * 5) + 1;
    let suffix = '';
    for (let i = 0; i < count; i++) {
        suffix += zw[Math.floor(Math.random() * zw.length)];
    }
    return text + suffix;
}

// 3. WARM-UP LOGIC
function calculateDailyLimit(startDate, initialLimit = 20, dailyIncrease = 0.20, maxLimit = 500) {
    const start = new Date(startDate); start.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    if (today < start) return initialLimit;
    const diffDays = Math.floor(Math.abs(today - start) / (1000*60*60*24));
    return Math.min(Math.floor(initialLimit * Math.pow(1 + dailyIncrease, diffDays)), maxLimit);
}

function canSendToday(sentCount, warmupStart) {
    const limit = calculateDailyLimit(warmupStart);
    return {
        allowed: sentCount < limit,
        sentToday: sentCount,
        limitToday: limit,
        remaining: Math.max(0, limit - sentCount)
    };
}

module.exports = { gaussianRandom, gaussianDelay, variateMessage, calculateDailyLimit, canSendToday };
