const { default: makeWASocket, DisconnectReason, delay, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const qrcode = require('qrcode');
const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');

const { useRedisAuthState } = require('./useRedisAuthState');
const { checkWarmupQuota, simulateHumanPresence, formatSafeMessage } = require('./safety-engine');
// Hapus import handleIncomingMessage lama karena sekarang di-handle oleh worker
const { initDB, insertMessage, insertReceipt, getMessagesByContact } = require('./db');
const { incomingMessageQueue } = require('./queue');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/dashboard', express.static('dashboard'));

const redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

app.use((req, res, next) => {
    req.sessionId = req.headers['x-session-id'] || req.query.session_id || 'default';
    next();
});

// ============ STATE MANAGEMENT ============
const sessions = new Map();

function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            sock: null,
            qrCodeData: null,
            connectionStatus: 'disconnected',
            messageQueue: [],
            isProcessing: false,
            dailySentCount: 0,
            warmupStartDate: new Date(),
            aiAutoReply: true,
            activeChats: new Map(), // Disimpan di RAM untuk performa inbox list (bisa juga dipindah ke DB/Redis ke depan)
        });
    }
    return sessions.get(sessionId);
}

// ============ MESSAGE QUEUE ============
async function processQueue(sessionId) {
    const session = getSession(sessionId);
    if (session.isProcessing || session.messageQueue.length === 0 || !session.sock) return;
    session.isProcessing = true;

    while (session.messageQueue.length > 0) {
        const task = session.messageQueue.shift();
        try {
            const status = checkWarmupQuota(session.dailySentCount, session.warmupStartDate);
            if (!status.allowed) {
                console.log(`[Queue-${sessionId}] LIMIT HARIAN TERCAPAI.`);
                session.messageQueue.length = 0;
                break;
            }

            console.log(`[Queue-${sessionId}] Memproses pesan untuk ${task.to}...`);

            const finalMessage = task.message.text
                ? { ...task.message, text: formatSafeMessage(task.message.text) }
                : task.message;

            // Simulasi ketik manusia sebelum mengirim
            await simulateHumanPresence(session.sock, task.to, finalMessage.text || '');

            const sentMsg = await session.sock.sendMessage(task.to, finalMessage);
            session.dailySentCount++;
            console.log(`[Queue-${sessionId}] Terkirim ke ${task.to}`);

            // Simpan riwayat OUTBOUND ke PostgreSQL
            if (sentMsg) {
                await insertMessage({
                    id: sentMsg.key.id,
                    sessionId: sessionId,
                    contactJid: task.to,
                    direction: 'outbound',
                    content: finalMessage.text
                });
            }

            if (session.activeChats.has(task.to)) {
                const chat = session.activeChats.get(task.to);
                chat.lastMessage = finalMessage.text;
                chat.lastTimestamp = Date.now();
                chat.unread = 0; 
                session.activeChats.set(task.to, chat);
            }
        } catch (err) {
            console.error(`[Queue-${sessionId}] Gagal kirim ke ${task.to}:`, err.message);
        }
        await delay(1000);
    }
    session.isProcessing = false;
}

function enqueueMessage(sessionId, to, message) {
    const session = getSession(sessionId);
    session.messageQueue.push({ to, message });
    console.log(`[Queue-${sessionId}] +1 antrean untuk ${to}. Total: ${session.messageQueue.length}`);
    processQueue(sessionId);
}

// ============ WHATSAPP CONNECTION ============
async function connectToWhatsApp(sessionId) {
    const session = getSession(sessionId);
    console.log(`[${sessionId}] Menghubungkan ke WhatsApp...`);
    
    const { state, saveCreds } = await useRedisAuthState(redisClient, sessionId);

    session.sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        syncFullHistory: false,
        generateHighQualityLinkPreviews: false,
        markOnlineOnConnect: false,
        logger: pino({ level: 'silent' }),
        browser: ['WA Gateway', 'Chrome', '1.0.0']
    });

    session.sock.ev.on('creds.update', saveCreds);

    session.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            session.qrCodeData = await qrcode.toDataURL(qr);
            if (sessionId === 'default') {
                await qrcode.toFile('./qr-code.png', qr).catch(()=>{});
            }
            session.connectionStatus = 'waiting_qr';
            console.log(`[${sessionId}] QR Code tersedia`);
        }
        if (connection === 'close') {
            session.connectionStatus = 'disconnected';
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${sessionId}] Koneksi tertutup. Reconnect:`, shouldReconnect);
            if (shouldReconnect) connectToWhatsApp(sessionId);
        } else if (connection === 'open') {
            session.connectionStatus = 'connected';
            session.qrCodeData = null;
            if (sessionId === 'default' && fs.existsSync('./qr-code.png')) {
                fs.unlinkSync('./qr-code.png');
            }
            console.log(`[${sessionId}] WhatsApp terhubung!`);
        }
    });

    // Tangkap Pesan Masuk (INBOUND)
    session.sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        if (msg.key.remoteJid.endsWith('@g.us')) return;

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const jid = msg.key.remoteJid;
        const pushName = msg.pushName || jid.split('@')[0];

        // Simpan riwayat INBOUND ke PostgreSQL
        await insertMessage({
            id: msg.key.id,
            sessionId: sessionId,
            contactJid: jid,
            direction: 'inbound',
            content: text,
            pushName: pushName
        });

        // 🚀 Push ke BullMQ untuk diproses Worker (AI & Webhook Laravel)
        // Set konfigurasi retry eksponensial di sini
        await incomingMessageQueue.add('process_wa_message', {
            sessionId: sessionId,
            jid: jid,
            text: text,
            pushName: pushName,
            messageId: msg.key.id
        }, {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 5000 // 5s, 25s, 125s, ...
            },
            removeOnComplete: true
        });

        session.activeChats.set(jid, {
            jid,
            pushName,
            lastMessage: text,
            lastTimestamp: Date.now(),
            unread: (session.activeChats.get(jid)?.unread || 0) + 1
        });
    });

    // Tangkap Status Delivery (Receipts)
    session.sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update.status) {
                // Konversi status Baileys (integer) ke string yang mudah dibaca
                const statusMap = {
                    2: 'sent',       // Server ACK
                    3: 'delivered',  // Delivery ACK
                    4: 'read',       // Read ACK
                    5: 'played'      // Played ACK
                };
                const statusName = statusMap[update.update.status];
                if (statusName) {
                    await insertReceipt(update.key.id, statusName);
                }
            }
        }
    });
}

// ============ API ENDPOINTS ============
app.get('/api/status', (req, res) => {
    const session = getSession(req.sessionId);
    const warmup = checkWarmupQuota(session.dailySentCount, session.warmupStartDate);
    res.json({ status: session.connectionStatus, queue: session.messageQueue.length, aiAutoReply: session.aiAutoReply, warmup });
});

app.get('/api/qr', (req, res) => {
    const session = getSession(req.sessionId);
    if (session.qrCodeData) return res.json({ qr: session.qrCodeData });
    if (session.connectionStatus === 'connected') return res.json({ message: 'Sudah terhubung' });
    res.json({ message: 'QR belum tersedia' });
});

app.post('/api/send', (req, res) => {
    const session = getSession(req.sessionId);
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone dan message wajib' });
    if (session.connectionStatus !== 'connected') return res.status(503).json({ error: 'WA belum terhubung' });
    const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    enqueueMessage(req.sessionId, jid, { text: message });
    res.json({ success: true, message: 'Masuk antrean' });
});

app.post('/api/broadcast', (req, res) => {
    const session = getSession(req.sessionId);
    const { phones, message } = req.body;
    if (!phones || !Array.isArray(phones) || !message) return res.status(400).json({ error: 'phones[] dan message wajib' });
    if (session.connectionStatus !== 'connected') return res.status(503).json({ error: 'WA belum terhubung' });
    phones.forEach(phone => {
        const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        enqueueMessage(req.sessionId, jid, { text: message });
    });
    res.json({ success: true, queued: phones.length });
});

app.post('/api/ai/toggle', (req, res) => {
    const session = getSession(req.sessionId);
    session.aiAutoReply = !session.aiAutoReply;
    res.json({ aiAutoReply: session.aiAutoReply, message: session.aiAutoReply ? 'AI Auto-Reply AKTIF' : 'AI Auto-Reply NONAKTIF' });
});

app.get('/api/messages/:jid', async (req, res) => {
    const { jid } = req.params;
    
    // FETCH DARI POSTGRESQL (RAM BEBAS BEBAN)
    const messages = await getMessagesByContact(req.sessionId, jid);
    
    res.json(messages);
});

app.get('/api/inbox', (req, res) => {
    const session = getSession(req.sessionId);
    const chats = Array.from(session.activeChats.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    res.json(chats);
});

app.post('/api/sessions/start', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    connectToWhatsApp(sessionId);
    res.json({ success: true, message: `Memulai sesi ${sessionId}` });
});

// ============ START ============
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`API Server: http://localhost:${PORT}`);
    
    // Inisialisasi Database Tables sebelum meluncur
    await initDB();

    connectToWhatsApp('default');
});
