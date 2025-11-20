import { Vec2 } from "renda";

/**
 * Улучшенный AI для ботов.
 * Принимает решения на основе игрового состояния: территория, угрозы, противники.
 */
export class BotAI {
	#player;
	#game;
	
	// Режимы поведения
	static MODES = {
		EXPAND: "expand",           // Расширение территории
		RETREAT: "retreat",         // Отступление в безопасную зону
		ATTACK: "attack",           // Атака противника
		CAUTIOUS: "cautious",       // Осторожное движение
	};
	
	#currentMode = BotAI.MODES.EXPAND;
	#targetDirection = null;
	#lastDirectionChange = 0;
	#stuckCounter = 0;
	#lastPosition = null;

	/**
	 * @param {import("../gameplay/Player.js").Player} player
	 * @param {import("../gameplay/Game.js").Game} game
	 */
	constructor(player, game) {
		this.#player = player;
		this.#game = game;
		this.#lastPosition = player.getPosition().clone();
	}

	/**
	 * Обновить AI и получить следующее направление
	 * @param {number} now
	 * @returns {import("../gameplay/Player.js").Direction}
	 */
	update(now) {
		if (!this.#player || this.#player.permanentlyDead) {
			return "up";
		}

		// Проверка застревания
		const currentPos = this.#player.getPosition();
		if (this.#lastPosition && currentPos.x === this.#lastPosition.x && currentPos.y === this.#lastPosition.y) {
			this.#stuckCounter++;
		} else {
			this.#stuckCounter = 0;
		}
		this.#lastPosition = currentPos.clone();

		// Если застряли, меняем направление
		if (this.#stuckCounter > 5) {
			this.#targetDirection = this.#getRandomDirection();
			this.#stuckCounter = 0;
			return this.#targetDirection;
		}

		// Оцениваем ситуацию и выбираем режим
		this.#evaluateSituation(now);

		// Принимаем решение в зависимости от режима
		const direction = this.#makeDecision(now);

		return direction;
	}

	/**
	 * Оценка текущей ситуации и выбор режима поведения
	 */
	#evaluateSituation(now) {
		const pos = this.#player.getPosition();
		const isOnOwnTerritory = this.#isOnOwnTerritory(pos);
		const hasTrail = this.#player.isGeneratingTrail;
		
		// Если на своей территории и нет следа - расширяемся
		if (isOnOwnTerritory && !hasTrail) {
			this.#currentMode = BotAI.MODES.EXPAND;
			return;
		}

		// Если создаём след, проверяем угрозы
		if (hasTrail) {
			const nearbyThreats = this.#findNearbyThreats(pos, 5);
			
			if (nearbyThreats.length > 0) {
				// Есть угрозы рядом - отступаем
				this.#currentMode = BotAI.MODES.RETREAT;
				return;
			}
			
			// Нет угроз, но мы на своем следе - осторожно двигаемся
			this.#currentMode = BotAI.MODES.CAUTIOUS;
			return;
		}

		// По умолчанию расширяемся
		this.#currentMode = BotAI.MODES.EXPAND;
	}

	/**
	 * Принять решение о следующем направлении
	 */
	#makeDecision(now) {
		const pos = this.#player.getPosition();
		
		switch (this.#currentMode) {
			case BotAI.MODES.RETREAT:
				return this.#findRetreatDirection(pos);
				
			case BotAI.MODES.ATTACK:
				return this.#findAttackDirection(pos);
				
			case BotAI.MODES.CAUTIOUS:
				return this.#findCautiousDirection(pos);
				
			case BotAI.MODES.EXPAND:
			default:
				return this.#findExpandDirection(pos, now);
		}
	}

	/**
	 * Найти направление для отступления на свою территорию
	 */
	#findRetreatDirection(pos) {
		const arena = this.#game.arena;
		const currentDir = this.#player.currentDirection === "paused" ? "up" : this.#player.currentDirection;
		
		// Ищем ближайшую свою клетку
		const directions = this.#getValidDirections(pos);
		let bestDirection = currentDir;
		let bestScore = -1000;

		for (const dir of directions) {
			const nextPos = this.#getNextPosition(pos, dir);
			
			// Проверяем что не врежемся в границу
			if (!this.#isValidPosition(nextPos)) {
				continue;
			}

			let score = 0;
			
			// Приоритет клеткам своей территории
			if (this.#isOnOwnTerritory(nextPos)) {
				score += 100;
			}
			
			// Избегаем других игроков
			const threats = this.#findNearbyThreats(nextPos, 3);
			score -= threats.length * 50;
			
			// Избегаем разворота на 180 градусов
			if (this.#isOppositeDirection(dir, currentDir)) {
				score -= 200;
			}

			if (score > bestScore) {
				bestScore = score;
				bestDirection = dir;
			}
		}

		return bestDirection;
	}

	/**
	 * Найти направление для атаки (движение к противнику)
	 */
	#findAttackDirection(pos) {
		// Упрощённая атака: движемся к ближайшему противнику
		const nearestEnemy = this.#findNearestEnemy(pos);
		
		if (nearestEnemy) {
			return this.#getDirectionTowards(pos, nearestEnemy);
		}
		
		return this.#findExpandDirection(pos, Date.now());
	}

	/**
	 * Найти осторожное направление (избегая опасностей)
	 */
	#findCautiousDirection(pos) {
		const currentDir = this.#player.currentDirection === "paused" ? "up" : this.#player.currentDirection;
		const directions = this.#getValidDirections(pos);
		
		let bestDirection = currentDir;
		let bestScore = -1000;

		for (const dir of directions) {
			const nextPos = this.#getNextPosition(pos, dir);
			
			if (!this.#isValidPosition(nextPos)) {
				continue;
			}

			let score = 0;
			
			// Приоритет возврату на свою территорию
			if (this.#isOnOwnTerritory(nextPos)) {
				score += 80;
			}
			
			// Избегаем угроз
			const threats = this.#findNearbyThreats(nextPos, 4);
			score -= threats.length * 60;
			
			// Избегаем разворота
			if (this.#isOppositeDirection(dir, currentDir)) {
				score -= 150;
			}
			
			// Предпочитаем продолжать текущее направление
			if (dir === currentDir) {
				score += 20;
			}

			if (score > bestScore) {
				bestScore = score;
				bestDirection = dir;
			}
		}

		return bestDirection;
	}

	/**
	 * Найти направление для расширения территории
	 */
	#findExpandDirection(pos, now) {
		const currentDir = this.#player.currentDirection === "paused" ? "up" : this.#player.currentDirection;
		
		// Меняем направление каждые 1-3 секунды
		const timeSinceLastChange = now - this.#lastDirectionChange;
		const shouldConsiderChange = timeSinceLastChange > (1000 + Math.random() * 2000);

		if (!shouldConsiderChange && this.#targetDirection) {
			// Продолжаем в текущем направлении
			const nextPos = this.#getNextPosition(pos, this.#targetDirection);
			if (this.#isValidPosition(nextPos) && !this.#isImmediateThreat(nextPos)) {
				return this.#targetDirection;
			}
		}

		// Выбираем новое направление
		const directions = this.#getValidDirections(pos);
		let bestDirection = currentDir;
		let bestScore = -1000;

		for (const dir of directions) {
			const nextPos = this.#getNextPosition(pos, dir);
			
			if (!this.#isValidPosition(nextPos)) {
				continue;
			}

			let score = Math.random() * 30; // Случайность для разнообразия
			
			// Предпочитаем пустые клетки (для захвата)
			if (!this.#isOnOwnTerritory(nextPos)) {
				score += 40;
			}
			
			// Избегаем угроз
			if (this.#isImmediateThreat(nextPos)) {
				score -= 100;
			}
			
			// Избегаем разворота
			if (this.#isOppositeDirection(dir, currentDir)) {
				score -= 80;
			}
			
			// Бонус за продолжение прямо
			if (dir === currentDir) {
				score += 15;
			}

			if (score > bestScore) {
				bestScore = score;
				bestDirection = dir;
			}
		}

		this.#targetDirection = bestDirection;
		this.#lastDirectionChange = now;
		return bestDirection;
	}

	/**
	 * Проверка что позиция на своей территории
	 */
	#isOnOwnTerritory(pos) {
		try {
			const tile = this.#game.arena.getTile(pos.x, pos.y);
			return tile === this.#player.id;
		} catch {
			return false;
		}
	}

	/**
	 * Проверка валидности позиции
	 */
	#isValidPosition(pos) {
		const arena = this.#game.arena;
		return pos.x >= 0 && pos.x < arena.width && pos.y >= 0 && pos.y < arena.height;
	}

	/**
	 * Найти ближайшие угрозы (других игроков)
	 */
	#findNearbyThreats(pos, radius) {
		const threats = [];
		
		for (const player of this.#game.getOverlappingViewportPlayersForPos(pos)) {
			if (player === this.#player || player.dead) continue;
			
			const playerPos = player.getPosition();
			const distance = Math.abs(playerPos.x - pos.x) + Math.abs(playerPos.y - pos.y);
			
			if (distance <= radius) {
				threats.push(player);
			}
		}
		
		return threats;
	}

	/**
	 * Проверка немедленной угрозы на позиции
	 */
	#isImmediateThreat(pos) {
		return this.#findNearbyThreats(pos, 2).length > 0;
	}

	/**
	 * Найти ближайшего врага
	 */
	#findNearestEnemy(pos) {
		let nearestEnemy = null;
		let minDistance = Infinity;
		
		for (const player of this.#game.getOverlappingViewportPlayersForPos(pos)) {
			if (player === this.#player || player.dead) continue;
			
			const playerPos = player.getPosition();
			const distance = Math.abs(playerPos.x - pos.x) + Math.abs(playerPos.y - pos.y);
			
			if (distance < minDistance) {
				minDistance = distance;
				nearestEnemy = playerPos;
			}
		}
		
		return nearestEnemy;
	}

	/**
	 * Получить направление к цели
	 */
	#getDirectionTowards(from, to) {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		
		if (Math.abs(dx) > Math.abs(dy)) {
			return dx > 0 ? "right" : "left";
		} else {
			return dy > 0 ? "down" : "up";
		}
	}

	/**
	 * Получить валидные направления
	 */
	#getValidDirections(pos) {
		return ["up", "down", "left", "right"];
	}

	/**
	 * Получить следующую позицию в направлении
	 */
	#getNextPosition(pos, direction) {
		const nextPos = pos.clone();
		
		switch (direction) {
			case "up":
				nextPos.y--;
				break;
			case "down":
				nextPos.y++;
				break;
			case "left":
				nextPos.x--;
				break;
			case "right":
				nextPos.x++;
				break;
		}
		
		return nextPos;
	}

	/**
	 * Проверка противоположного направления
	 */
	#isOppositeDirection(dir1, dir2) {
		return (
			(dir1 === "up" && dir2 === "down") ||
			(dir1 === "down" && dir2 === "up") ||
			(dir1 === "left" && dir2 === "right") ||
			(dir1 === "right" && dir2 === "left")
		);
	}

	/**
	 * Получить случайное направление
	 */
	#getRandomDirection() {
		const directions = ["up", "down", "left", "right"];
		return directions[Math.floor(Math.random() * directions.length)];
	}
}

