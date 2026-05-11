const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/crm_db',
});

// Helper untuk format YYYY_MM
function getMonthPartitionName(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `messages_${year}_${month}`;
}

async function initDB() {
    const client = await pool.connect();
    try {
        console.log('[DB] Menginisialisasi Skema Database...');
        
        // 1. Buat Tabel Utama (Partitioned)
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR(100) NOT NULL,
                session_id VARCHAR(50) NOT NULL,
                contact_jid VARCHAR(100) NOT NULL,
                direction VARCHAR(10) NOT NULL, -- 'inbound' / 'outbound'
                content TEXT,
                push_name VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (id, created_at) -- Kunci partisi harus bagian dari PK
            ) PARTITION BY RANGE (created_at);
        `);

        // 2. Buat Partisi Bulan Ini & Bulan Depan jika belum ada
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const twoMonthsLater = new Date(now.getFullYear(), now.getMonth() + 2, 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const currentPart = getMonthPartitionName(now);
        const nextPart = getMonthPartitionName(nextMonth);

        await client.query(`
            CREATE TABLE IF NOT EXISTS ${currentPart} PARTITION OF messages 
            FOR VALUES FROM ('${startOfMonth.toISOString()}') TO ('${nextMonth.toISOString()}');
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS ${nextPart} PARTITION OF messages 
            FOR VALUES FROM ('${nextMonth.toISOString()}') TO ('${twoMonthsLater.toISOString()}');
        `);

        // 3. Buat Tabel Status (Message Receipts)
        await client.query(`
            CREATE TABLE IF NOT EXISTS message_receipts (
                message_id VARCHAR(100) NOT NULL,
                status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'read', 'failed'
                occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        // Index untuk query receipt lebih cepat
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_receipts_msg_id ON message_receipts(message_id);
        `);

        // 4. Buat Tabel Contacts Status (AI vs Human Handover)
        await client.query(`
            CREATE TABLE IF NOT EXISTS contacts_status (
                jid VARCHAR(100) PRIMARY KEY,
                status VARCHAR(50) NOT NULL DEFAULT 'ai_active', -- 'ai_active', 'needs_human_intervention', 'human_active'
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        console.log('[DB] Skema berhasil diinisialisasi.');
    } catch (error) {
        console.error('[DB] Gagal inisialisasi skema:', error.message);
    } finally {
        client.release();
    }
}

async function insertMessage({ id, sessionId, contactJid, direction, content, pushName }) {
    const query = `
        INSERT INTO messages (id, session_id, contact_jid, direction, content, push_name)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
    `;
    const values = [id, sessionId, contactJid, direction, content, pushName || null];
    try {
        await pool.query(query, values);
    } catch (error) {
        console.error('[DB] Error insert message:', error.message);
    }
}

async function insertReceipt(messageId, status) {
    const query = `
        INSERT INTO message_receipts (message_id, status)
        VALUES ($1, $2)
    `;
    try {
        await pool.query(query, [messageId, status]);
    } catch (error) {
        console.error('[DB] Error insert receipt:', error.message);
    }
}

async function getMessagesByContact(sessionId, contactJid, limit = 50) {
    // Bergantung pada Postgres, query ini sangat cepat karena Partition Pruning
    const query = `
        SELECT m.id, m.direction, m.content, m.created_at, m.push_name,
               (SELECT status FROM message_receipts WHERE message_id = m.id ORDER BY occurred_at DESC LIMIT 1) as latest_status
        FROM messages m
        WHERE m.session_id = $1 AND m.contact_jid = $2
        ORDER BY m.created_at ASC
        LIMIT $3
    `;
    try {
        const { rows } = await pool.query(query, [sessionId, contactJid, limit]);
        return rows.map(r => ({
            id: r.id,
            fromMe: r.direction === 'outbound',
            text: r.content,
            timestamp: new Date(r.created_at).getTime(),
            pushName: r.push_name,
            status: r.latest_status
        }));
    } catch (error) {
        console.error('[DB] Error fetch messages:', error.message);
        return [];
    }
}

async function updateChatStatus(jid, status) {
    const query = `
        INSERT INTO contacts_status (jid, status, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (jid) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
    `;
    try {
        await pool.query(query, [jid, status]);
    } catch (error) {
        console.error('[DB] Error update chat status:', error.message);
    }
}

async function getChatStatus(jid) {
    const query = `SELECT status FROM contacts_status WHERE jid = $1`;
    try {
        const { rows } = await pool.query(query, [jid]);
        return rows.length > 0 ? rows[0].status : 'ai_active'; // Default to AI
    } catch (error) {
        console.error('[DB] Error get chat status:', error.message);
        return 'ai_active';
    }
}

module.exports = {
    pool,
    initDB,
    insertMessage,
    insertReceipt,
    getMessagesByContact,
    updateChatStatus,
    getChatStatus
};
