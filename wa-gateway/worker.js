const { Worker } = require('bullmq');
const axios = require('axios');
const Redis = require('ioredis');
const { getAIReply } = require('./ai-handler');
const db = require('./db');

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

// URL API Internal Node.js Gateway untuk mengirim balasan WA
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001';
// URL Backend Laravel untuk meneruskan webhook
const LARAVEL_WEBHOOK_URL = process.env.LARAVEL_WEBHOOK_URL || 'http://localhost:8000/api/webhook';

// Worker Processor
const worker = new Worker('incoming_messages', async job => {
    const { sessionId, jid, text, pushName, messageId } = job.data;
    console.log(`[Worker] Memproses job ${job.id} untuk ${jid}`);

    // 1. Cek status chat saat ini di DB
    const chatStatus = await db.getChatStatus(jid);
    let aiResponseText = null;

    // 2. Jika AI aktif, minta AI merespons
    if (chatStatus === 'ai_active') {
        try {
            // Delay opsional simulasi read
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const reply = await getAIReply(jid, text, sessionId);
            aiResponseText = reply.text;

            if (reply.handover) {
                console.log(`[Worker] Status Chat untuk ${jid} diubah menjadi 'needs_human_intervention'`);
            }

            // Kirim balasan via HTTP API ke Gateway Node.js
            await axios.post(`${GATEWAY_URL}/api/send`, {
                phone: jid,
                message: reply.text
            }, {
                headers: { 'x-session-id': sessionId }
            });

            // Simpan respon AI ke database
            await db.insertMessage({
                id: 'AI_' + Date.now(),
                sessionId: sessionId,
                contactJid: jid,
                direction: 'outbound',
                content: reply.text,
                pushName: 'AI Bot'
            });

            console.log(`[Worker] Balasan terkirim ke ${jid}: "${reply.text}"`);

        } catch (err) {
            console.error(`[Worker] AI Error:`, err.message);
            // Fallback
            await axios.post(`${GATEWAY_URL}/api/send`, {
                phone: jid,
                message: 'Maaf, sistem kami sedang sibuk. Admin akan segera membalas 🙏'
            }, { headers: { 'x-session-id': sessionId } }).catch(() => {});
            
            await db.updateChatStatus(jid, 'needs_human_intervention');
        }
    }

    // 3. Teruskan pesan ini ke backend Laravel (Webhook)
    // Mekanisme RETRY otomatis akan bekerja jika ini throw error
    try {
        console.log(`[Worker] Meneruskan payload ke Laravel...`);
        await axios.post(LARAVEL_WEBHOOK_URL, {
            session_id: sessionId,
            message_id: messageId,
            jid: jid,
            push_name: pushName,
            text: text,
            ai_replied: chatStatus === 'ai_active',
            ai_response: aiResponseText,
            timestamp: new Date().toISOString()
        }, {
            timeout: 10000 // Timeout 10 detik
        });
        console.log(`[Worker] Payload berhasil diterima Laravel.`);
    } catch (err) {
        console.error(`[Worker] Gagal meneruskan ke Laravel:`, err.message);
        // Lempar error agar BullMQ mengulangi (retry) job ini
        throw new Error(`Laravel Webhook failed: ${err.message}`);
    }

}, { 
    connection,
    concurrency: 5 // Memproses 5 pesan secara paralel
});

// Listener Error
worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job.id} gagal setelah beberapa percobaan:`, err.message);
});

console.log('[Worker] Berjalan dan mendengarkan antrean "incoming_messages"...');
