// Internationalization module
const translations = {
	en: {
		// Menu
		"menu.about": "about",
		"menu.leaderboards": "leaderboards",
		"menu.privacy": "privacy",
		"menu.quality": "Quality",
		"menu.uglyMode": "Ugly mode",
		"menu.spectatorMode": "Spectator mode",
		"menu.language": "Language",
		
		// Form
		"form.namePlaceholder": "Enter your name",
		"form.loading": "Loading...",
		"form.join": "Join",
		
		// Lobby
		"lobby.waiting": "Waiting for players...",
		"lobby.cancel": "Cancel",
		
		// Stats
		"stats.lastGame": "Last game",
		"stats.bestGame": "Best game",
		"stats.kills": "Kills",
		"stats.blocksCaptured": "Blocks captured",
		"stats.score": "Score",
		"stats.yourRank": "Your rank",
		"stats.of": "of",
		"stats.rankTime": "{time} on #1",
		"stats.killedBy": "killed by {killer}",
		"stats.kills.one": "{count} player killed",
		"stats.kills.few": "{count} players killed",
		"stats.kills.many": "{count} players killed",
		"stats.alive": "{time} alive",
		"stats.blocks.one": "{count} block captured",
		"stats.blocks.few": "{count} blocks captured",
		"stats.blocks.many": "{count} blocks captured",
		"stats.highestRank": "#{rank} highest rank",
		
		// Quality
		"quality.low": "low",
		"quality.medium": "medium",
		"quality.high": "high",
		"quality.auto": "auto",
		
		// Mode
		"mode.on": "on",
		"mode.off": "off",
		
		// Tutorial
		"tutorial.closeArea": "Close an area to fill it with your color.",
		"tutorial.dontGetHit": "Don't get hit by other players.",
		
		// Skin screen
		"skin.color": "Color",
		"skin.pattern": "Pattern",
		"skin.save": "Save",
		"skin.back": "Back",
		"skin.title": "block customization",
		
		// Ads
		"ads.removeAds": "Don't want to see ads?",
		
		// News
		"news.recentUpdates": "Recent updates!",
		"news.spectatorMode": "Spectator mode",
		"news.spectatorModeDesc": "You can now spectate games using the 'spectator mode' toggle in the top right. Check it out! To toggle visibility of other spectators, you can press the 'm' key. Many thanks to {link} for this feature!",
		"news.globalLeaderboards": "Global leaderboards",
		"news.serverSelection": "Server selection",
		"news.newServerRewrite": "New server rewrite",
		"news.openSource": "Splix is now open source",
		"news.changelog": "Changelog",
		
		// About page
		"about.title": "Space Bee Battle - About",
		"about.whatIs": "What is Space Bee Battle?",
		"about.description": "<strong>Space Bee Battle</strong> is a multiplayer casual io game with play-to-earn elements. A real-time territory capture game with cryptocurrency monetization. Players compete for control of the game field, earning cryptocurrency for eliminating opponents.",
		"about.telegramApp": "The game works as a <strong>Telegram Mini App</strong> — you can play directly in Telegram without installing additional applications. Just open the game in Telegram and start capturing territory!",
		"about.gameplay": "Game Mechanics",
		"about.gameplayDesc": "Your goal is to capture as much territory as possible on the game field. You control a character that leaves a colored trail on its path. When you return to your territory and close the contour, the entire area inside becomes yours.",
		"about.warning": "<strong>Beware!</strong> If you or another player crosses an unclosed trail, the player who left the trail will be eliminated. You are safe on your territory, but once you leave its boundaries — you become vulnerable.",
		"about.elimination": "Players can eliminate each other in two ways:",
		"about.elimination1": "Crossing an opponent's unclosed trail",
		"about.elimination2": "Capturing all opponent's territory (when their territory is completely painted over by other players)",
		"about.economy": "Economic System",
		"about.economyDesc": "Space Bee Battle uses a cryptocurrency economy based on the <strong>TON (The Open Network)</strong> blockchain.",
		"about.deposits": "<strong>Deposits:</strong> Before starting the game, you choose a deposit level (1, 5, 10, 25, or 50 TON). The deposit is made through Telegram Wallet — Telegram's built-in wallet.",
		"about.rewards": "<strong>Rewards:</strong> For each opponent elimination, you receive their deposit to your balance. Winnings can be withdrawn back to your TON wallet.",
		"about.extralife": "<strong>Extra Life:</strong> Once a day, you can play with Extra Life protection, paying only 33% of the regular deposit. When eliminated, you simply exit the match without losing your deposit.",
		"about.multiplayer": "Multiplayer System",
		"about.multiplayerDesc": "The game supports matches for 4-8 players. The matchmaking system matches players with the same deposit level. If there are not enough real players, the room is filled with bots with realistic behavior.",
		"about.matchDuration": "The match continues until one winner remains. Game duration is unlimited — the most resilient and strategically thinking player wins!",
		"about.integration": "Telegram and TON Integration",
		"about.integrationDesc": "Space Bee Battle is fully integrated with the Telegram ecosystem:",
		"about.integration1": "Automatic authorization through Telegram",
		"about.integration2": "Direct payments through Telegram Wallet",
		"about.integration3": "Notifications about match starts, victories, and rewards",
		"about.integration4": "Ability to share results with friends",
		"about.tonTransactions": "All transactions are processed on the TON blockchain — fast transfers (3-5 seconds) and low network fees.",
		"about.tech": "Technologies",
		"about.techDesc": "Space Bee Battle is built on modern technologies:",
		"about.tech1": "<strong>Frontend:</strong> React.js / Vue.js with TypeScript, Canvas API / WebGL for rendering",
		"about.tech2": "<strong>Backend:</strong> Node.js (TypeScript) or Go with WebSocket for real-time interaction",
		"about.tech3": "<strong>Database:</strong> PostgreSQL for data storage, Redis for caching",
		"about.tech4": "<strong>Blockchain:</strong> TON (The Open Network) for cryptocurrency operations",
		"about.tech5": "<strong>Infrastructure:</strong> Docker, Kubernetes for scalability",
		"about.security": "Security and Fairness",
		"about.securityDesc": "We guarantee fair play:",
		"about.security1": "Server-side validation of all player actions",
		"about.security2": "Protection against cheats and bots",
		"about.security3": "Transparent economic system",
		"about.security4": "Secure storage of funds",
		"about.thanks": "Acknowledgments",
		"about.thanksDesc": "Space Bee Battle is based on the game <a href=\"http://splix.io\" target=\"_blank\">Splix.io</a>, which was inspired by classic games <a href=\"http://www.freewebarcade.com/game/qix/\" target=\"_blank\">Qix</a>, <a href=\"https://archive.org/details/msdos_Xonix_1984\" target=\"_blank\">Xonix</a> and <a href=\"https://archive.org/details/pacxon_swf/\" target=\"_blank\">Pac-Xon</a>.",
		"about.final": "Thank you to all players for participating in Space Bee Battle! Join our community and earn cryptocurrency by playing an exciting game!",
	},
	ru: {
		// Menu
		"menu.about": "о нас",
		"menu.leaderboards": "таблицы лидеров",
		"menu.privacy": "конфиденциальность",
		"menu.quality": "Качество",
		"menu.uglyMode": "Упрощённый режим",
		"menu.spectatorMode": "Режим наблюдателя",
		"menu.language": "Язык",
		
		// Form
		"form.namePlaceholder": "Введите ваше имя",
		"form.loading": "Загрузка...",
		"form.join": "Присоединиться",
		
		// Lobby
		"lobby.waiting": "Ожидание игроков...",
		"lobby.cancel": "Отмена",
		
		// Stats
		"stats.lastGame": "Последняя игра",
		"stats.bestGame": "Лучшая игра",
		"stats.kills": "Убийства",
		"stats.blocksCaptured": "Захвачено блоков",
		"stats.score": "Очки",
		"stats.yourRank": "Ваш ранг",
		"stats.of": "из",
		"stats.rankTime": "{time} на #1 месте",
		"stats.killedBy": "убит игроком {killer}",
		"stats.kills.one": "{count} игрок убит",
		"stats.kills.few": "{count} игрока убито",
		"stats.kills.many": "{count} игроков убито",
		"stats.alive": "{time} в живых",
		"stats.blocks.one": "{count} блок захвачен",
		"stats.blocks.few": "{count} блока захвачено",
		"stats.blocks.many": "{count} блоков захвачено",
		"stats.highestRank": "#{rank} максимальный ранг",
		
		// Quality
		"quality.low": "низкое",
		"quality.medium": "среднее",
		"quality.high": "высокое",
		"quality.auto": "авто",
		
		// Mode
		"mode.on": "вкл",
		"mode.off": "выкл",
		
		// Tutorial
		"tutorial.closeArea": "Закройте область, чтобы заполнить её своим цветом.",
		"tutorial.dontGetHit": "Не дайте другим игрокам вас ударить.",
		
		// Skin screen
		"skin.color": "Цвет",
		"skin.pattern": "Узор",
		"skin.save": "Сохранить",
		"skin.back": "Назад",
		"skin.title": "настройка блока",
		
		// Ads
		"ads.removeAds": "Не хотите видеть рекламу?",
		
		// News
		"news.recentUpdates": "Последние обновления!",
		"news.spectatorMode": "Режим наблюдателя",
		"news.spectatorModeDesc": "Теперь вы можете наблюдать за играми, используя переключатель 'режим наблюдателя' в правом верхнем углу. Попробуйте! Чтобы переключить видимость других наблюдателей, нажмите клавишу 'm'. Большое спасибо {link} за эту функцию!",
		"news.globalLeaderboards": "Глобальные таблицы лидеров",
		"news.serverSelection": "Выбор сервера",
		"news.newServerRewrite": "Новая переработка сервера",
		"news.openSource": "Splix теперь с открытым исходным кодом",
		"news.changelog": "История изменений",
		
		// About page
		"about.title": "Space Bee Battle - О нас",
		"about.whatIs": "Что такое Space Bee Battle?",
		"about.description": "<strong>Space Bee Battle</strong> — это многопользовательская казуальная игра в жанре io с элементами play-to-earn. Игра на захват территории в реальном времени с криптовалютной монетизацией. Игроки соревнуются за контроль над игровым полем, зарабатывая криптовалюту за устранение соперников.",
		"about.telegramApp": "Игра работает как <strong>Telegram Mini App</strong> — вы можете играть прямо в Telegram без установки дополнительных приложений. Просто откройте игру в Telegram и начните захватывать территорию!",
		"about.gameplay": "Игровая механика",
		"about.gameplayDesc": "Ваша цель — захватить как можно больше территории на игровом поле. Вы управляете персонажем, который оставляет цветной след на своем пути. Когда вы возвращаетесь на свою территорию и замыкаете контур, вся область внутри становится вашей.",
		"about.warning": "<strong>Осторожно!</strong> Если вы или другой игрок пересечете незамкнутый след, игрок, оставивший след, будет устранен. На своей территории вы в безопасности, но как только выйдете за её пределы — становитесь уязвимы.",
		"about.elimination": "Игроки могут устранять друг друга двумя способами:",
		"about.elimination1": "Пересечение незамкнутого следа противника",
		"about.elimination2": "Захват всей территории противника (когда его территория полностью закрашивается другими игроками)",
		"about.economy": "Экономическая система",
		"about.economyDesc": "Space Bee Battle использует криптовалютную экономику на базе блокчейна <strong>TON (The Open Network)</strong>.",
		"about.deposits": "<strong>Депозиты:</strong> Перед началом игры вы выбираете уровень депозита (1, 5, 10, 25 или 50 TON). Депозит вносится через Telegram Wallet — встроенный кошелек Telegram.",
		"about.rewards": "<strong>Награды:</strong> За каждое устранение противника вы получаете его депозит на свой баланс. Выигранные средства можно вывести обратно в свой кошелек TON.",
		"about.extralife": "<strong>Extra Life:</strong> Один раз в день вы можете сыграть с защитой Extra Life, заплатив только 33% от обычного депозита. При устранении вы просто выходите из матча без потери депозита.",
		"about.multiplayer": "Многопользовательская система",
		"about.multiplayerDesc": "Игра поддерживает матчи на 4-8 игроков. Система матчмейкинга подбирает игроков с одинаковым уровнем депозита. Если не хватает реальных игроков, комната заполняется ботами с реалистичным поведением.",
		"about.matchDuration": "Матч продолжается до тех пор, пока не останется один победитель. Длительность игры не ограничена — побеждает самый выносливый и стратегически мыслящий игрок!",
		"about.integration": "Интеграция с Telegram и TON",
		"about.integrationDesc": "Space Bee Battle полностью интегрирован с экосистемой Telegram:",
		"about.integration1": "Автоматическая авторизация через Telegram",
		"about.integration2": "Прямые платежи через Telegram Wallet",
		"about.integration3": "Уведомления о начале матчей, победах и наградах",
		"about.integration4": "Возможность делиться результатами с друзьями",
		"about.tonTransactions": "Все транзакции обрабатываются в блокчейне TON — быстрые переводы (3-5 секунд) и низкие комиссии сети.",
		"about.tech": "Технологии",
		"about.techDesc": "Space Bee Battle построен на современных технологиях:",
		"about.tech1": "<strong>Frontend:</strong> React.js / Vue.js с TypeScript, Canvas API / WebGL для рендеринга",
		"about.tech2": "<strong>Backend:</strong> Node.js (TypeScript) или Go с WebSocket для real-time взаимодействия",
		"about.tech3": "<strong>База данных:</strong> PostgreSQL для хранения данных, Redis для кеширования",
		"about.tech4": "<strong>Blockchain:</strong> TON (The Open Network) для криптовалютных операций",
		"about.tech5": "<strong>Инфраструктура:</strong> Docker, Kubernetes для масштабируемости",
		"about.security": "Безопасность и честность",
		"about.securityDesc": "Мы гарантируем честную игру:",
		"about.security1": "Server-side валидация всех действий игроков",
		"about.security2": "Защита от читов и ботов",
		"about.security3": "Прозрачная экономическая система",
		"about.security4": "Безопасное хранение средств",
		"about.thanks": "Благодарности",
		"about.thanksDesc": "Space Bee Battle основан на игре <a href=\"http://splix.io\" target=\"_blank\">Splix.io</a>, которая была вдохновлена классическими играми <a href=\"http://www.freewebarcade.com/game/qix/\" target=\"_blank\">Qix</a>, <a href=\"https://archive.org/details/msdos_Xonix_1984\" target=\"_blank\">Xonix</a> и <a href=\"https://archive.org/details/pacxon_swf/\" target=\"_blank\">Pac-Xon</a>.",
		"about.final": "Спасибо всем игрокам за участие в Space Bee Battle! Присоединяйтесь к нашему сообществу и зарабатывайте криптовалюту, играя в увлекательную игру!",
	}
};

// Get current language from localStorage or default to browser language
function getCurrentLanguage() {
	const saved = localStorage.getItem("language");
	if (saved && (saved === "en" || saved === "ru")) {
		return saved;
	}
	// Try to detect browser language
	const browserLang = navigator.language || navigator.userLanguage;
	if (browserLang.startsWith("ru")) {
		return "ru";
	}
	return "en";
}

// Set language
function setLanguage(lang) {
	if (lang === "en" || lang === "ru") {
		localStorage.setItem("language", lang);
		updateTranslations();
	}
}

// Get translation
function t(key, params = {}) {
	const lang = getCurrentLanguage();
	const translation = translations[lang]?.[key] || translations.en[key] || key;
	
	// Replace parameters
	if (params && Object.keys(params).length > 0) {
		return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
			return params[paramKey] || match;
		});
	}
	
	return translation;
}

// Update all translations on the page
function updateTranslations() {
	const lang = getCurrentLanguage();
	
	// Update elements with data-i18n attribute
	document.querySelectorAll("[data-i18n]").forEach(el => {
		const key = el.getAttribute("data-i18n");
		const text = t(key);
		const useHtml = el.hasAttribute("data-i18n-html");
		if (el.tagName === "INPUT" && el.type === "text") {
			el.placeholder = text;
		} else if (el.tagName === "INPUT" && el.type === "submit") {
			el.value = text;
		} else if (el.tagName === "TITLE") {
			el.textContent = text;
		} else if (useHtml) {
			el.innerHTML = text;
		} else {
			el.textContent = text;
		}
	});
	
	// Update title attribute
	document.querySelectorAll("[data-i18n-title]").forEach(el => {
		const key = el.getAttribute("data-i18n-title");
		el.title = t(key);
	});
	
	// Trigger custom event for JavaScript updates
	document.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));
}

// Initialize on load
if (typeof document !== "undefined") {
	function initTranslations() {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", updateTranslations);
		} else {
			updateTranslations();
		}
	}
	initTranslations();
}

// Export for use in modules
if (typeof window !== "undefined") {
	window.i18n = {
		t,
		setLanguage,
		getCurrentLanguage,
		updateTranslations,
	};
	
	// Ensure translations are applied when i18n is ready
	// This helps with pages that load i18n as a module
	if (document.readyState === "complete" || document.readyState === "interactive") {
		// If DOM is already loaded, apply translations immediately
		setTimeout(updateTranslations, 0);
	}
}

