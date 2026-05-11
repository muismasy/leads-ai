const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Pastikan Redis sudah berjalan. 
const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

// Inisialisasi Antrean Utama untuk Pesan Masuk
const incomingMessageQueue = new Queue('incoming_messages', { connection });

module.exports = {
    incomingMessageQueue,
    connection
};
