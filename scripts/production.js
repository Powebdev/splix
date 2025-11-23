import { serveDir } from "$std/http/file_server.ts";
import { resolve } from "$std/path/mod.ts";
import { setCwd } from "chdir-anywhere";
import { init as initGameServer } from "../gameServer/src/mainInstance.js";
import { init as initTrainingServer } from "../gameServer/src/trainingInstance.js";
import { init as initServerManager } from "../serverManager/src/mainInstance.js";
import "$std/dotenv/load.ts";
import { ensureDir } from "$std/fs/mod.ts";
setCwd();

Deno.chdir("..");

const port = parseInt(Deno.env.get("PORT") || "8080");
const hostname = Deno.env.get("HOSTNAME") || "0.0.0.0";
const websocketAuthToken = Deno.env.get("WEBSOCKET_AUTH_TOKEN") || "change_me_in_production";
const forceDomain = Deno.env.get("FORCE_DOMAIN") === "1";
const publicScheme = Deno.env.get("PUBLIC_SCHEME") || "https";

const persistentStoragePath = resolve("serverManager/persistentStorage.json");
await ensureDir(resolve("serverManager"));

// Общий auth hook для всех серверов
const createAuthHook = () => ({
	async authenticatePlayer({ token, ip }) {
		// Разрешаем подключение всем игрокам, токен не обязателен.
		const safeIp = typeof ip == "string" ? ip : "";

		let telegramId = undefined;
		if (token && typeof token === "string" && token.startsWith("u.")) {
			const parts = token.split(".");
			if (parts.length >= 2) {
				const tid = parseInt(parts[1], 10);
				if (!isNaN(tid)) {
					telegramId = tid;
				}
			}
		}

		return {
			success: true,
			playerName: undefined, // клиент пришлёт имя отдельным сообщением
			isSpectator: false,
			hasExtraLife: false,
			depositTier: 0,
			userId: undefined,
			telegramId: telegramId,
			metadata: token ? { token, ip: safeIp } : { ip: safeIp },
		};
	},
});

// Инициализация игрового сервера на 4 игрока (основной)
const gameServer4Players = initGameServer({
	arenaWidth: 100,
	arenaHeight: 100,
	pitWidth: 16,
	pitHeight: 16,
	gameMode: "default",
	hooks: createAuthHook(),
	minPlayers: 4,
	maxPlayers: 4,
	countdownMs: 3000,
});

// Инициализация игрового сервера на 2 игрока (дуэли)
const gameServer2Players = initGameServer({
	arenaWidth: 100,
	arenaHeight: 100,
	pitWidth: 12,
	pitHeight: 12,
	gameMode: "default",
	hooks: createAuthHook(),
	minPlayers: 2,
	maxPlayers: 2,
	countdownMs: 2000,
});

// Инициализация тренировочного сервера (персональные арены)
// Использует TrainingMain вместо обычного Main - создаёт отдельную арену для каждого игрока
const gameServerTraining = initTrainingServer({
	arenaWidth: 100,
	arenaHeight: 100,
	pitWidth: 14,
	pitHeight: 14,
	gameMode: "default",
	hooks: createAuthHook(),
});

// Инициализация server manager
const serverManager = initServerManager({
	persistentStoragePath,
	websocketAuthToken,
});

// Автоматическое создание игровых серверов при первом запуске
const protocol = Deno.env.get("PROTOCOL") || "wss"; // Всегда используем wss для production
const domain = Deno.env.get("DOMAIN") || "space-bot.ru";
const publicBaseUrl = Deno.env.get("PUBLIC_URL") || `${publicScheme}://${domain}`;

const gameServer4Endpoint = `${protocol}://${domain}/gameserver`;
const gameServer2Endpoint = `${protocol}://${domain}/gameserver-duo`;
const gameServerTrainingEndpoint = `${protocol}://${domain}/gameserver-training`;

// Проверяем, есть ли уже серверы
const serversJson = serverManager.servermanager.getServersJson();
console.log(`Initial servers check: ${serversJson.servers.length} server(s) found`);

if (serversJson.servers.length === 0) {
	console.log("No game servers found. Creating game servers...");

	// Создаём три сервера
	serverManager.servermanager.createGameServer();
	serverManager.servermanager.createGameServer();
	serverManager.servermanager.createGameServer();

	const serverConfigs = serverManager.servermanager.getServerConfigs();
	console.log(`Server configs after creation: ${serverConfigs.length}`);

	if (serverConfigs.length >= 3) {
		// Настраиваем сервер на 4 игрока (основной)
		serverManager.servermanager.setGameServerConfig(serverConfigs[0].id, {
			public: true,
			official: true,
			recommended: true,
			needsControlSocket: false,
			displayName: "Игра на четверых",
			endpoint: gameServer4Endpoint,
		});

		// Настраиваем сервер на 2 игрока (дуэли)
		serverManager.servermanager.setGameServerConfig(serverConfigs[1].id, {
			public: true,
			official: true,
			recommended: false,
			needsControlSocket: false,
			displayName: "Игра на двоих",
			endpoint: gameServer2Endpoint,
		});

		// Настраиваем тренировочный сервер
		serverManager.servermanager.setGameServerConfig(serverConfigs[2].id, {
			public: true,
			official: true,
			recommended: false,
			needsControlSocket: false,
			displayName: "Тренировочный режим",
			endpoint: gameServerTrainingEndpoint,
		});

		console.log(`Configured ${serverConfigs.length} game servers`);
	}
} else {
	console.log(`Found ${serversJson.servers.length} existing game server(s)`);
	for (const server of serversJson.servers) {
		console.log(`  - ${server.displayName}: ${server.endpoint} (${server.playerCount} players)`);
	}
}

// Путь к собранному клиенту
const clientDistDir = resolve("client/out/dist");
// Путь к собранной админке
const adminPanelDistDir = resolve("adminPanel/out/dist");

// Функция для установки заголовков CORS и безопасности для мини-приложений
/**
 * @param {Response} response
 */
function setMiniAppHeaders(response) {
	response.headers.set("Access-Control-Allow-Origin", "*");
	response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
	response.headers.set("X-Frame-Options", "ALLOWALL");
	response.headers.set("X-Content-Type-Options", "nosniff");
	// Disable caches to ensure latest admin/client assets are served in production deploys
	response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
	response.headers.set("Pragma", "no-cache");
	response.headers.set("Expires", "0");
	return response;
}

Deno.serve({
	port,
	hostname,
}, async (request, info) => {
	const url = new URL(request.url);
	const hostHeader = request.headers.get("host") || "";
	const isWebSocketUpgrade = (request.headers.get("upgrade") || "").toLowerCase() === "websocket";

	// Принудительный редирект на целевой домен (чтобы не открывалось как localhost:8080)
	// Никогда не редиректим WebSocket upgrade-запросы
	if (forceDomain && !isWebSocketUpgrade && hostHeader && !hostHeader.toLowerCase().startsWith(domain.toLowerCase())) {
		const location = `${publicBaseUrl}${url.pathname}${url.search}`;
		return new Response(null, {
			status: 301,
			headers: {
				"Location": location,
			},
		});
	}

	// Обработка OPTIONS запросов для CORS
	if (request.method === "OPTIONS") {
		return setMiniAppHeaders(new Response(null, { status: 204 }));
	}

	// Главная страница - редирект на клиент
	if (url.pathname == "/" || url.pathname == "/index.html") {
		const indexHtml = await Deno.readTextFile(resolve(clientDistDir, "index.html"));
		const response = new Response(indexHtml, {
			headers: {
				"Content-Type": "text/html",
			},
		});
		return setMiniAppHeaders(response);
	}

	// WebSocket для игрового сервера на 4 игрока (основной)
	if (url.pathname == "/gameserver" || url.pathname == "/ws") {
		const response = await gameServer4Players.websocketManager.handleRequest(request, info);
		return setMiniAppHeaders(response);
	}

	// WebSocket для игрового сервера на 2 игрока (дуэли)
	if (url.pathname == "/gameserver-duo") {
		const response = await gameServer2Players.websocketManager.handleRequest(request, info);
		return setMiniAppHeaders(response);
	}

	// WebSocket для тренировочного сервера
	if (url.pathname == "/gameserver-training") {
		const response = await gameServerTraining.websocketManager.handleRequest(request, info);
		return setMiniAppHeaders(response);
	}

	// Endpoint для получения токена админки
	if (url.pathname.startsWith("/servermanagerToken")) {
		const response = new Response(websocketAuthToken);
		return setMiniAppHeaders(response);
	}

	// Server manager endpoints
	if (url.pathname.startsWith("/servermanager")) {
		const response = await serverManager.handleRequest(request, info);
		return setMiniAppHeaders(response);
	}

	// Админка
	if (url.pathname == "/adminpanel" || url.pathname == "/adminpanel/") {
		try {
			let adminHtml = await Deno.readTextFile(resolve(adminPanelDistDir, "index.html"));
			// Исправляем пути к статическим файлам
			const buildVersion = Date.now().toString();
			adminHtml = adminHtml.replace(/\.\/bundle\//g, "/adminpanel/bundle/");
			// добавляем cache-busting к стилям
			adminHtml = adminHtml.replace(/\.\/style\.css/g, `/adminpanel/style.css?v=${buildVersion}`);
			adminHtml = adminHtml.replace(/href="style\.css"/g, 'href="/adminpanel/style.css"');
			const response = new Response(adminHtml, {
				headers: {
					"Content-Type": "text/html",
				},
			});
			return setMiniAppHeaders(response);
		} catch (e) {
			console.error("Failed to load admin panel:", e);
			return new Response("Admin panel not found. Please build it first: deno task build-adminpanel", { status: 404 });
		}
	}

	// Статические файлы админки (bundle, style.css)
	if (url.pathname.startsWith("/adminpanel/bundle/") || url.pathname == "/adminpanel/style.css") {
		const filePath = url.pathname.startsWith("/adminpanel/bundle/")
			? resolve(adminPanelDistDir, url.pathname.substring("/adminpanel/".length))
			: resolve(adminPanelDistDir, "style.css");
		try {
			const file = await Deno.open(filePath, { read: true });
			const fileInfo = await Deno.stat(filePath);

			let contentType = "application/octet-stream";
			if (filePath.endsWith(".js")) {
				contentType = "application/javascript";
			} else if (filePath.endsWith(".css")) {
				contentType = "text/css";
			}

			const response = new Response(file.readable, {
				headers: {
					"Content-Type": contentType,
					"Content-Length": fileInfo.size.toString(),
				},
			});
			return setMiniAppHeaders(response);
		} catch (e) {
			if (e instanceof Deno.errors.NotFound) {
				return new Response("File not found", { status: 404 });
			}
			throw e;
		}
	}

	// Deps для админки (renda)
	if (url.pathname.startsWith("/deps/")) {
		try {
			const response = await serveDir(request, {
				fsRoot: resolve("deps"),
				quiet: true,
			});
			return setMiniAppHeaders(response);
		} catch {
			return new Response("Dependency not found", { status: 404 });
		}
	}

	// Статические страницы клиента
	if (url.pathname == "/about" || url.pathname == "/about.html") {
		const aboutHtml = await Deno.readTextFile(resolve(clientDistDir, "about.html"));
		const response = new Response(aboutHtml, {
			headers: {
				"Content-Type": "text/html",
			},
		});
		return setMiniAppHeaders(response);
	}

	if (url.pathname == "/leaderboards" || url.pathname == "/leaderboards.html") {
		const leaderboardsHtml = await Deno.readTextFile(resolve(clientDistDir, "leaderboards.html"));
		const response = new Response(leaderboardsHtml, {
			headers: {
				"Content-Type": "text/html",
			},
		});
		return setMiniAppHeaders(response);
	}

	if (url.pathname == "/privacy" || url.pathname == "/privacy.html") {
		const privacyHtml = await Deno.readTextFile(resolve(clientDistDir, "privacy.html"));
		const response = new Response(privacyHtml, {
			headers: {
				"Content-Type": "text/html",
			},
		});
		return setMiniAppHeaders(response);
	}

	if (url.pathname == "/flags.html") {
		const flagsHtml = await Deno.readTextFile(resolve(clientDistDir, "flags.html"));
		const response = new Response(flagsHtml, {
			headers: {
				"Content-Type": "text/html",
			},
		});
		return setMiniAppHeaders(response);
	}

	// Обслуживание статических файлов из собранного клиента
	if (url.pathname.startsWith("/static/") ||
		url.pathname.startsWith("/bundle/") ||
		url.pathname.startsWith("/json/")) {
		const filePath = resolve(clientDistDir, url.pathname.substring(1));
		try {
			const file = await Deno.open(filePath, { read: true });
			const fileInfo = await Deno.stat(filePath);

			// Определение Content-Type
			let contentType = "application/octet-stream";
			if (url.pathname.endsWith(".js")) {
				contentType = "application/javascript";
			} else if (url.pathname.endsWith(".css")) {
				contentType = "text/css";
			} else if (url.pathname.endsWith(".html")) {
				contentType = "text/html";
			} else if (url.pathname.endsWith(".json")) {
				contentType = "application/json";
			} else if (url.pathname.endsWith(".png")) {
				contentType = "image/png";
			} else if (url.pathname.endsWith(".svg")) {
				contentType = "image/svg+xml";
			} else if (url.pathname.endsWith(".mp3")) {
				contentType = "audio/mpeg";
			} else if (url.pathname.endsWith(".pdf")) {
				contentType = "application/pdf";
			} else if (url.pathname.endsWith(".txt")) {
				contentType = "text/plain";
			}

			const response = new Response(file.readable, {
				headers: {
					"Content-Type": contentType,
					"Content-Length": fileInfo.size.toString(),
				},
			});
			return setMiniAppHeaders(response);
		} catch (e) {
			if (e instanceof Deno.errors.NotFound) {
				return new Response("File not found", { status: 404 });
			}
			throw e;
		}
	}

	// Fallback: попытка обслужить из dist директории
	try {
		const response = await serveDir(request, {
			fsRoot: clientDistDir,
			quiet: true,
		});
		return setMiniAppHeaders(response);
	} catch {
		return new Response("Not found", { status: 404 });
	}
});

console.log(`Production server started on http://${hostname}:${port}`);
console.log(`Public base URL: ${publicBaseUrl}/`);
console.log(`Client available at: ${publicBaseUrl}/`);
console.log(`Admin panel available at: ${publicBaseUrl}/adminpanel/`);
console.log(`Game servers:`);
console.log(`  - 4 Players: ${gameServer4Endpoint}`);
console.log(`  - 2 Players (Duo): ${gameServer2Endpoint}`);
console.log(`  - Training: ${gameServerTrainingEndpoint}`);

