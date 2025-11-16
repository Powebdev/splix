// Скрипт для исправления endpoint существующего сервера
// Использование: deno run -A scripts/fixServerEndpoint.js [serverId]

import "$std/dotenv/load.ts";
import { readTextFile, writeTextFile } from "$std/fs/mod.ts";

const serverId = parseInt(Deno.args[0] || "1");
const protocol = Deno.env.get("PROTOCOL") || "wss";
const domain = Deno.env.get("DOMAIN") || "space-bot.ru";
const gameServerEndpoint = `${protocol}://${domain}/gameserver`;

const storagePath = "serverManager/persistentStorage.json";

console.log(`Исправление endpoint для сервера ID: ${serverId}`);
console.log(`Новый endpoint: ${gameServerEndpoint}`);

try {
	const storageContent = await readTextFile(storagePath);
	const storage = JSON.parse(storageContent);
	
	const server = storage.servers.find(s => s.id === serverId);
	if (!server) {
		console.error(`Сервер с ID ${serverId} не найден!`);
		console.log(`Доступные серверы:`, storage.servers.map(s => `ID ${s.id}: ${s.config.displayName}`).join(", "));
		Deno.exit(1);
	}
	
	console.log(`Текущая конфигурация:`);
	console.log(`  Display Name: ${server.config.displayName}`);
	console.log(`  Endpoint: ${server.config.endpoint}`);
	
	server.config.endpoint = gameServerEndpoint;
	server.config.displayName = `${domain} Server`;
	
	await writeTextFile(storagePath, JSON.stringify(storage, null, "\t"));
	
	console.log(`\n✅ Сервер успешно обновлен!`);
	console.log(`  Display Name: ${server.config.displayName}`);
	console.log(`  Endpoint: ${server.config.endpoint}`);
	console.log(`\nПерезапустите production сервер для применения изменений:`);
	console.log(`  sudo systemctl restart splix-production`);
} catch (error) {
	console.error(`Ошибка:`, error.message);
	Deno.exit(1);
}


