/**
 * AI Auto-Reply Handler menggunakan Google Gemini API
 * Fitur: System Instruction Ketat, Memory dari DB, Handover Protocol dengan Function Calling
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./db');

// ============ CONFIG ============
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `Anda adalah Asisten CS Profesional (AI) dari Toko WA Pertama.
Tugas utama Anda adalah menyapa pelanggan, menjawab pertanyaan dasar, dan memberikan pelayanan yang ramah.

ATURAN SANGAT KETAT (DILARANG MELANGGAR):
1. Anda HANYA boleh menjawab berdasarkan informasi berikut (Basis Data Toko):
   - Jam operasional: Senin-Jumat 09:00 - 17:00.
   - Metode pembayaran: Transfer Bank (BCA, Mandiri) dan e-Wallet (OVO, GoPay).
   - Pengiriman: JNE, J&T, Sicepat. Pengiriman dilakukan H+1 setelah pembayaran.
   - Kebijakan retur: Bisa retur maksimal 2 hari setelah barang diterima dengan bukti video unboxing.
2. JANGAN PERNAH berhalusinasi atau mengarang informasi harga, stok, promo, atau produk yang tidak disebutkan di atas.
3. Jawab dengan ramah, sopan, singkat (Maksimal 2-3 kalimat), dan gunakan bahasa Indonesia yang natural serta emoji secukupnya.
4. JIKA pelanggan menanyakan hal di luar konteks di atas (seperti harga spesifik, ketersediaan stok), atau jika pelanggan terlihat marah/kecewa, ATAU jika pelanggan secara eksplisit meminta bicara dengan admin manusia, ANDA WAJIB memanggil tool/fungsi 'escalate_to_human'. JANGAN mencoba menjawab pertanyaan kompleks tersebut secara asal.
`;

// ============ GEMINI TOOLS (FUNCTION CALLING) ============
const escalateTool = {
    name: "escalate_to_human",
    description: "Panggil fungsi ini HANYA jika pengguna menanyakan harga, stok produk, pertanyaan yang sangat kompleks di luar pengetahuan Anda, jika pengguna terlihat marah, atau jika pengguna secara eksplisit meminta berbicara dengan admin/manusia/CS sungguhan.",
    parameters: {
        type: "object",
        properties: {
            reason: {
                type: "string",
                description: "Alasan mengapa obrolan ini dialihkan ke manusia (misal: 'Menanyakan harga', 'Pengguna marah', 'Meminta admin')."
            }
        },
        required: ["reason"]
    }
};

const HANDOVER_RESPONSE = '⏳ Terima kasih atas pesan Anda. Untuk pertanyaan tersebut, staf admin kami akan segera membantu Anda lebih lanjut. Mohon tunggu sebentar ya 🙏';

// ============ GEMINI AI CHAT ============
async function getAIReply(jid, userMessage, sessionId) {
    // 1. Ambil history dari database (maksimal 10 pesan terakhir)
    const rawHistory = await db.getMessagesByContact(sessionId, jid, 10);
    
    // 2. Format history untuk Gemini (Harus alternate user-model)
    const history = [];
    let lastRole = null;
    
    for (const msg of rawHistory) {
        if (!msg.text) continue;
        // Hindari duplikasi jika pesan terakhir yang masuk ke DB adalah pesan user saat ini
        if (msg.text === userMessage) continue;

        const role = msg.fromMe ? 'model' : 'user';
        
        // Gemini butuh alternate turn. Jika role berurutan sama, gabungkan saja teksnya.
        if (role === lastRole && history.length > 0) {
            history[history.length - 1].parts[0].text += `\n${msg.text}`;
        } else {
            history.push({
                role: role,
                parts: [{ text: msg.text }]
            });
            lastRole = role;
        }
    }
    
    // Syarat startChat history: tidak boleh berakhiran dengan 'user'. 
    // Jika ya, gabungkan pesan user terakhir ke prompt `userMessage` agar sesuai struktur.
    let finalUserMessage = userMessage;
    if (history.length > 0 && history[history.length - 1].role === 'user') {
        const lastUserMsg = history.pop();
        finalUserMessage = lastUserMsg.parts[0].text + `\n` + userMessage;
    }

    // 3. Siapkan model dengan system instruction & tools
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [escalateTool] }],
    });

    // 4. Mulai chat dengan history
    const chat = model.startChat({
        history: history.length > 0 ? history : undefined,
    });

    // 5. Kirim pesan user ke Gemini
    const result = await chat.sendMessage(finalUserMessage);
    const response = result.response;
    
    // 6. Cek apakah Gemini memutuskan untuk memanggil tool escalate_to_human
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls.find(c => c.name === 'escalate_to_human');
        if (call) {
            console.log(`[AI] Gemini memicu HANDOVER. Alasan: ${call.args.reason}`);
            // Ubah status di DB
            await db.updateChatStatus(jid, 'needs_human_intervention');
            return { text: HANDOVER_RESPONSE, handover: true };
        }
    }

    // 7. Jika tidak memanggil tool, kembalikan teks normal
    const aiText = response.text().trim();
    return { text: aiText, handover: false };
}

// ============ HANDLER UTAMA ============
/**
 * Proses pesan masuk dan hasilkan balasan AI
 * @param {Object} sock - Baileys socket instance
 * @param {Object} msg - Raw message dari messages.upsert
 * @param {String} sessionId - ID Sesi WA Gateway
 */
async function handleIncomingMessage(sock, msg, sessionId = 'default') {
    const jid = msg.key.remoteJid;

    // Ekstrak teks dari berbagai tipe pesan
    const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || null;

    // Abaikan jika bukan pesan teks
    if (!text) return;
    
    // Cek status chat saat ini di DB (Apakah sudah diambil alih manusia?)
    const chatStatus = await db.getChatStatus(jid);
    
    // Jika status BUKAN ai_active, biarkan admin/sistem lain yang membalas
    if (chatStatus !== 'ai_active') {
        console.log(`[AI] Mengabaikan pesan dari ${jid}. Status chat: ${chatStatus}`);
        return;
    }

    console.log(`[AI] Pesan masuk dari ${jid}: "${text}"`);

    try {
        // Dapatkan balasan dari Gemini
        const reply = await getAIReply(jid, text, sessionId);

        if (reply.handover) {
            console.log(`[AI] Status Chat untuk ${jid} diubah menjadi 'needs_human_intervention'`);
        }

        // Simulasikan mengetik (Typing indicator)
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);

        // Delay realistis berdasarkan panjang teks
        const typingDelay = Math.min(Math.max(reply.text.length * 50, 1500), 4000);
        await new Promise(r => setTimeout(r, typingDelay));

        await sock.sendPresenceUpdate('paused', jid);
        
        // Kirim balasan
        await sock.sendMessage(jid, { text: reply.text });

        // Simpan respon AI ke database agar history lengkap
        await db.insertMessage({
            id: 'AI_' + Date.now(), // Generate mock ID untuk respons AI
            sessionId: sessionId,
            contactJid: jid,
            direction: 'outbound',
            content: reply.text,
            pushName: 'AI Bot'
        });

        console.log(`[AI] Balasan terkirim ke ${jid}: "${reply.text}"`);

    } catch (err) {
        console.error(`[AI] Error:`, err.message);
        
        // Fallback jika API Limit / Error
        await sock.sendMessage(jid, {
            text: 'Maaf, sistem kami sedang mengalami gangguan kecil. Admin akan segera membantu Anda 🙏'
        });
        
        // Escalate otomatis agar admin sadar ada error yang tidak dibalas bot
        await db.updateChatStatus(jid, 'needs_human_intervention');
    }
}

module.exports = {
    handleIncomingMessage,
    getAIReply
};
