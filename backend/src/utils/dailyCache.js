// src/utils/dailyCache.js
function msUntilNextMidnightLocal() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0); // next local midnight
    return next.getTime() - now.getTime();
}

function stableKey(obj) {
    // stable JSON key (simple + good enough for query params)
    return JSON.stringify(obj, Object.keys(obj).sort());
}

class DailyCache {
    constructor() {
        /** @type {Map<string, { expiresAt:number, value:any }>} */
        this.store = new Map();
        /** @type {Map<string, Promise<any>>} */
        this.inFlight = new Map();
    }

    get(key) {
        const hit = this.store.get(key);
        if (!hit) return null;
        if (Date.now() >= hit.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return hit.value;
    }

    set(key, value) {
        const ttl = msUntilNextMidnightLocal();
        this.store.set(key, { value, expiresAt: Date.now() + ttl });
    }

    async getOrSet(key, fetcher) {
        // 1) cached value?
        const cached = this.get(key);
        if (cached) return cached;

        // 2) already fetching?
        const inflight = this.inFlight.get(key);
        if (inflight) return await inflight;

        // 3) fetch and cache
        const p = (async () => {
            try {
                const value = await fetcher();
                this.set(key, value);
                return value;
            } finally {
                this.inFlight.delete(key);
            }
        })();

        this.inFlight.set(key, p);
        return await p;
    }

    makeKey(parts) {
        return stableKey(parts);
    }
}

module.exports = { DailyCache };
