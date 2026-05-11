import { proto } from "@whiskeysockets/baileys";
import { BufferJSON, initAuthCreds } from "@whiskeysockets/baileys";
import type Redis from "ioredis";

/**
 * Custom auth state for Baileys that persists to Redis.
 * Allows multiple sessions to coexist and survive container restarts.
 */
export async function useRedisAuthState(redis: Redis, sessionId: string) {
  const key = `wa_session:${sessionId}`;

  const readData = async (type: string) => {
    const data = await redis.get(`${key}:${type}`);
    return data ? JSON.parse(data, BufferJSON.reviver) : null;
  };

  const writeData = async (data: any, type: string) => {
    const str = JSON.stringify(data, BufferJSON.replacer);
    await redis.set(`${key}:${type}`, str);
  };

  const removeData = async (type: string) => {
    await redis.del(`${key}:${type}`);
  };

  const creds: any = (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const data: { [id: string]: any } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data: any) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const name = `${category}-${id}`;
              if (value) {
                await writeData(value, name);
              } else {
                await removeData(name);
              }
            }
          }
        },
      },
    },
    saveCreds: () => writeData(creds, "creds"),
  };
}
