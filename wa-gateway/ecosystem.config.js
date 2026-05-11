module.exports = {
  apps: [
    {
      name: "wa-gateway",
      script: "./index.js",
      instances: "max",       // Manfaatkan semua core CPU untuk scalability
      exec_mode: "cluster",   // Cluster mode untuk load balancing internal PM2
      max_memory_restart: "500M", // Hard limit: Restart otomatis jika menyentuh 500MB
      node_args: "--max-old-space-size=450 --expose-gc", // Agresif membatasi memori GC engine
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        REDIS_URL: "redis://127.0.0.1:6379" // Sesuaikan dengan URL Redis Anda
      }
    },
    {
      name: "wa-worker",
      script: "./worker.js",
      instances: 1, // Biasanya worker cukup 1 instance atau disesuaikan dengan koneksi database
      exec_mode: "fork",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        REDIS_URL: "redis://127.0.0.1:6379",
        GATEWAY_URL: "http://localhost:3001",
        LARAVEL_WEBHOOK_URL: "http://localhost:8000/api/webhook"
      }
    }
  ]
}
