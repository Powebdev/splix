/**
 * @typedef KillEventPayload
 * @property {number | null} killerTelegramId
 * @property {string | null} killerUserId
 * @property {number | null} victimTelegramId
 * @property {string | null} victimUserId
 * @property {boolean} victimHasExtraLife
 * @property {boolean} victimIsBot
 * @property {string | null} depositTier
 * @property {string} occurredAt
 * @property {string | null} serverId
 * @property {string | null} matchId
 */

/**
 * @typedef SessionEndPayload
 * @property {number | null} userTelegramId
 * @property {string | null} userId
 * @property {string | null} serverId
 * @property {string | null} matchId
 * @property {string | null} depositTier
 * @property {number} kills
 * @property {number} maxTiles
 * @property {number} capturedTiles
 * @property {number} timeAliveSeconds
 * @property {string} startedAt
 * @property {string} endedAt
 */

export class PaymentServiceBridge {
	#baseUrl;
	#authToken;

	/**
	 * @param {Object} options
	 * @param {string?} [options.baseUrl]
	 * @param {string?} [options.authToken]
	 */
	constructor({ baseUrl, authToken } = {}) {
		this.#baseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
		this.#authToken = authToken || "";
	}

	get enabled() {
		return Boolean(this.#baseUrl);
	}

	/**
	 * @param {number} serverId
	 * @param {KillEventPayload} payload
	 */
	async reportKillEvent(serverId, payload) {
		if (!this.enabled || !payload) return;
		try {
			const body = this.#buildKillRequest(serverId, payload);
			await this.#post("/game/kill", body);
		} catch (error) {
			console.error("Failed to report kill event to Payment Service", error);
		}
	}

	/**
	 * @param {number} serverId
	 * @param {SessionEndPayload} payload
	 */
	async reportSessionEnd(serverId, payload) {
		if (!this.enabled || !payload) return;
		try {
			const body = this.#buildSessionRequest(serverId, payload);
			await this.#post("/game/sessionEnd", body);
		} catch (error) {
			console.error("Failed to report session end to Payment Service", error);
		}
	}

	async #post(path, body) {
		const url = `${this.#baseUrl}${path}`;
		const headers = new Headers({
			"Content-Type": "application/json",
		});
		if (this.#authToken) {
			headers.set("Authorization", `Bearer ${this.#authToken}`);
		}
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});
		if (!response.ok) {
			const text = await response.text();
			console.error(
				`Payment Service responded with ${response.status} ${response.statusText} for ${path}: ${text}`,
			);
		}
	}

	/**
	 * @param {number} serverId
	 * @param {KillEventPayload} payload
	 */
	#buildKillRequest(serverId, payload) {
		const depositTier = payload.depositTier ?? null;
		return {
			killerTelegramId: payload.killerTelegramId ?? null,
			victimTelegramId: payload.victimTelegramId ?? null,
			victimHasExtraLife: Boolean(payload.victimHasExtraLife),
			victimIsBot: Boolean(payload.victimIsBot),
			depositTier,
			serverId: payload.serverId || String(serverId),
			matchId: payload.matchId ?? null,
			occurredAt: payload.occurredAt,
		};
	}

	/**
	 * @param {number} serverId
	 * @param {SessionEndPayload} payload
	 */
	#buildSessionRequest(serverId, payload) {
		return {
			userTelegramId: payload.userTelegramId ?? null,
			serverId: payload.serverId || String(serverId),
			matchId: payload.matchId ?? null,
			depositTier: payload.depositTier ?? null,
			kills: payload.kills,
			maxTiles: payload.maxTiles,
			capturedTiles: payload.capturedTiles,
			timeAliveSeconds: payload.timeAliveSeconds,
			startedAt: payload.startedAt,
			endedAt: payload.endedAt,
		};
	}
}

