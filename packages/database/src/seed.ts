import { db, aiAgents, tenants, users } from "./index";
import { hashPassword } from "./utils";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // 1. Create a demo tenant
    const [tenant] = await db.insert(tenants).values({
      name: "Demo Business",
      slug: "demo",
      plan: "pro",
      aiCreditsRemaining: 10000,
    }).returning();

    console.log(`✅ Created tenant: ${tenant.name} (${tenant.id})`);

    // 2. Create a demo AI Agent
    await db.insert(aiAgents).values({
      tenantId: tenant.id,
      name: "LeadsAI Assistant",
      model: "gemini-2.0-flash",
      systemPrompt: "Anda adalah asisten penjualan yang ramah untuk Demo Business. Tugas Anda adalah membantu pelanggan memahami produk kami dan mengarahkan mereka untuk meninggalkan detail kontak jika tertarik.",
      temperature: "0.3",
      isActive: true,
    });

    console.log("✅ Created AI Agent");

    // 3. Create a demo user
    const [user] = await db.insert(users).values({
      tenantId: tenant.id,
      email: "admin@demo.com",
      name: "Admin Demo",
      passwordHash: await hashPassword("password123"),
      role: "owner",
    }).returning();

    console.log(`✅ Created user: ${user.email} (password: password123)`);

    console.log("🚀 Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();
