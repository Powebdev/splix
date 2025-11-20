import { BotConnection } from "./BotConnection.js";
import { BotAI } from "./BotAI.js";

const DIRECTIONS = ["up", "down", "left", "right"];

export class Bot {
	/**
	 * @param {import("../Main.js").Main} mainInstance
	 * @param {number} id
	 */
	constructor(mainInstance, id) {
		this.#mainInstance = mainInstance;
		this.#id = id;
		this.#connection = new BotConnection(() => {
			this.#markForRemoval = true;
		});
		const auth = {
			success: true,
			playerName: `Bot-${id}`,
			telegramId: null,
			userId: null,
			depositTier: 0,
			hasExtraLife: true,
			metadata: {
				isBot: true,
			},
		};
		this.#player = this.#mainInstance.game.createPlayer(this.#connection, {
			skin: {
				colorId: 1 + (id % 6),
				patternId: 0,
			},
			name: auth.playerName,
			isSpectator: false,
			auth,
		});
		this.#direction = this.#randomDirection();
		
		// Инициализируем улучшенный AI
		this.#ai = new BotAI(this.#player, this.#mainInstance.game);
	}

	#id;
	#mainInstance;
	#connection;
	#player;
	#direction;
	#lastDirectionChange = 0;
	#markForRemoval = false;
	#ai;

	get player() {
		return this.#player;
	}

	get isActive() {
		return Boolean(this.#player) && !this.#player.permanentlyDead && !this.#markForRemoval;
	}

	update(now) {
		if (!this.#player || this.#player.permanentlyDead || this.#markForRemoval) {
			return;
		}
		if (this.#player.dead && this.#player.permanentlyDead) {
			this.#markForRemoval = true;
			return;
		}
		
		// Используем улучшенный AI для выбора направления
		this.#direction = this.#ai.update(now);
		
		const pos = this.#player.getPosition();
		this.#player.clientPosUpdateRequested(this.#direction, pos);
	}

	destroy() {
		if (this.#player) {
			this.#mainInstance.game.removePlayer(this.#player);
			this.#player = null;
		}
		this.#markForRemoval = true;
		this.#ai = null;
	}

	#randomDirection() {
		const index = Math.floor(Math.random() * DIRECTIONS.length);
		return /** @type {import("../gameplay/Player.js").Direction} */ (DIRECTIONS[index]);
	}
}

