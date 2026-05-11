/**
 * Safety Engine untuk WhatsApp Gateway
 * Menyediakan fitur anti-ban yang mensimulasikan perilaku manusia.
 */

// ==========================================
// 1. WARM-UP LOGIC: Naik 20% setiap 2 hari
// ==========================================
function calculateDailyLimit(startDate, initialLimit = 20, increaseRate = 0.20, maxLimit = 500) {
    const start = new Date(startDate); 
    start.setHours(0,0,0,0);
    const today = new Date(); 
    today.setHours(0,0,0,0);
    
    if (today < start) return initialLimit;
    
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    
    // Kuota naik setiap 2 hari
    const periods = Math.floor(diffDays / 2);
    
    const currentLimit = Math.floor(initialLimit * Math.pow(1 + increaseRate, periods));
    return Math.min(currentLimit, maxLimit);
}

function checkWarmupQuota(sentCount, warmupStartDate) {
    const limit = calculateDailyLimit(warmupStartDate);
    return {
        allowed: sentCount < limit,
        sentToday: sentCount,
        limitToday: limit,
        remaining: Math.max(0, limit - sentCount)
    };
}


// ==========================================
// 2. HUMAN SIMULATION: Meniru cara mengetik manusia
// ==========================================
function gaussianRandom(min, max, skew = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5;
    if (num > 1 || num < 0) return gaussianRandom(min, max, skew);
    num = Math.pow(num, skew);
    num *= max - min;
    num += min;
    return Math.floor(num);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mensimulasikan 'typing...' berdasarkan panjang pesan.
 * Kecepatan ketik acak menggunakan kurva gaussian agar natural.
 */
async function simulateHumanPresence(sock, jid, text = '') {
    // Jika tidak ada teks (misal pesan hanya gambar), set durasi minimum
    const textLength = text.length > 0 ? text.length : 15;
    
    // Tentukan kecepatan ketik: 1 karakter ~ 100-250ms (Rata-rata 200-300 WPM)
    const baseTimePerChar = gaussianRandom(100, 250);
    
    // Durasi ketik adalah panjang teks * kecepatan per karakter
    // Batasi maksimum waktu ngetik (misal 15 detik) agar queue tidak terhambat ekstrim
    let typingDuration = Math.min(textLength * baseTimePerChar, 15000);
    // Minimal durasi composing adalah 2 detik
    typingDuration = Math.max(typingDuration, 2000);
    
    console.log(`[SafetyEngine] Mensimulasikan 'composing' selama ${Math.floor(typingDuration)}ms untuk ${textLength} karakter.`);

    try {
        await sock.presenceSubscribe(jid);
        await delay(500); // Jeda sejenak sebelum status composing muncul
        await sock.sendPresenceUpdate('composing', jid);
        
        await delay(typingDuration);
        
        await sock.sendPresenceUpdate('paused', jid);
    } catch (err) {
        console.error('[SafetyEngine] Gagal memicu sendPresenceUpdate:', err.message);
    }
}


// ==========================================
// 3. SPINTAX & VARIATOR: Mencegah filter anti-spam mendeteksi teks statis massal
// ==========================================

// Parse format spintax {Teks A|Teks B|Teks C}
function parseSpintax(text) {
    const spintaxRegex = /\{([^{}]+)\}/g;
    return text.replace(spintaxRegex, (match, contents) => {
        const choices = contents.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

// Menambahkan variasi minor (tanda baca di akhir) agar hash string berubah
function variatePunctuation(text) {
    let varied = text.trim();
    // 30% probabilitas untuk memvariasikan tanda seru di akhir kalimat
    if (Math.random() > 0.7 && varied.endsWith('!')) {
        varied = varied.slice(0, -1) + (Math.random() > 0.5 ? '!!' : '.');
    }
    // 30% probabilitas mengganti titik ganda di akhir (jika pesan santai)
    else if (Math.random() > 0.7 && varied.endsWith('.')) {
        varied = varied + (Math.random() > 0.5 ? '.' : ' .');
    }
    return varied;
}

// Menyisipkan Zero-Width Characters untuk membuat digital footprint / MD5 hash teks unik
function addZeroWidthCharacters(text) {
    const zw = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
    const count = Math.floor(Math.random() * 4) + 1; // 1-4 karakter
    let suffix = '';
    // Disisipkan di akhir pesan agar tidak merusak formatting (bold/italic) di WA
    for (let i = 0; i < count; i++) {
        suffix += zw[Math.floor(Math.random() * zw.length)];
    }
    return text + suffix;
}

/**
 * Menerapkan seluruh lapis variator pada teks.
 */
function formatSafeMessage(text) {
    if (!text) return text;
    let safeText = parseSpintax(text);
    safeText = variatePunctuation(safeText);
    safeText = addZeroWidthCharacters(safeText);
    return safeText;
}


module.exports = { 
    checkWarmupQuota, 
    simulateHumanPresence, 
    formatSafeMessage 
};
