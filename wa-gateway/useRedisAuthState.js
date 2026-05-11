const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');

/**
 * Adaptor Redis untuk Baileys Auth State
 * @param {import('ioredis').Redis} redisClient 
 * @param {string} sessionId 
 */
const useRedisAuthState = async (redisClient, sessionId) => {
    const credsKey = `wa:auth:${sessionId}:creds`;
    const keysKeyPrefix = `wa:auth:${sessionId}:keys:`;

    const writeData = async (data, key) => {
        const str = JSON.stringify(data, BufferJSON.replacer);
        await redisClient.set(key, str);
    };

    const readData = async (key) => {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data, BufferJSON.reviver) : null;
    };

    let creds = await readData(credsKey);
    if (!creds) {
        creds = initAuthCreds();
        await writeData(creds, credsKey);
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${keysKeyPrefix}${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const pipeline = redisClient.pipeline();
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${keysKeyPrefix}${category}-${id}`;
                            if (value) {
                                pipeline.set(key, JSON.stringify(value, BufferJSON.replacer));
                            } else {
                                pipeline.del(key);
                            }
                        }
                    }
                    await pipeline.exec();
                }
            }
        },
        saveCreds: () => writeData(creds, credsKey)
    };
};

module.exports = { useRedisAuthState };
