import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.7.1/mod.js";
import {
	downloadFile,
	downloadNpmPackage,
	vendor,
} from "https://raw.githubusercontent.com/jespertheend/dev/9ae4c87bc54156c47d4f097a61615eaa2c716904/mod.js";
import { serveDir } from "$std/http/file_server.ts";
import { resolve } from "$std/path/mod.ts";
import { setCwd } from "chdir-anywhere";
import { init as initGameServer } from "../gameServer/src/mainInstance.js";
import { init as initServerManager } from "../serverManager/src/mainInstance.js";
import "$std/dotenv/load.ts";
import { INSECURE_LOCALHOST_SERVERMANAGER_TOKEN } from "../shared/config.js";
import { ensureDir } from "$std/fs/mod.ts";
setCwd();

Deno.chdir("..");

vendor({
	entryPoints: [
		"https://raw.githubusercontent.com/rendajs/Renda/705c5a01bc4d3ca4a282fff1a7a8567d1be7ce04/mod.js",
	],
	outDir: "./deps",
});
downloadNpmPackage({
	package: "@adlad/adlad@1.0.0",
	destination: "./deps/adlad/1.0.0",
});
downloadNpmPackage({
	package: "@adlad/plugin-dummy@0.4.0",
	destination: "./deps/adlad-plugin-dummy/0.4.0",
});
downloadNpmPackage({
	package: "@adlad/plugin-adinplay@0.0.3",
	destination: "./deps/adlad-plugin-adinplay/0.0.3",
});

generateTypes({
	include: [
		"scripts/",
		"gameServer/",
		"shared/",
	],
	importMap: "importmap.json",
	excludeUrls: [
		"https://raw.githubusercontent.com/rendajs/Renda/5722ef6433ed217715bb4ef0ab2bbd6a96b3992d/studio/src/styles/projectSelectorStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/5722ef6433ed217715bb4ef0ab2bbd6a96b3992d/studio/src/styles/studioStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/5722ef6433ed217715bb4ef0ab2bbd6a96b3992d/studio/src/styles/shadowStyles.js",
		"https://raw.githubusercontent.com/rendajs/Renda/5722ef6433ed217715bb4ef0ab2bbd6a96b3992d/studio/deps/rollup-plugin-resolve-url-objects.js",
		"https://raw.githubusercontent.com/rendajs/Renda/5722ef6433ed217715bb4ef0ab2bbd6a96b3992d/studio/deps/rollup.browser.js",
		"rollup",
	],
	exactTypeModules: {
		"$rollup": "https://cdn.jsdelivr.net/npm/rollup@3.5.0/dist/rollup.d.ts",
		"$rollup-plugin-alias": "https://cdn.jsdelivr.net/npm/@rollup/plugin-alias@4.0.2/types/index.d.ts",
		"$rollup-plugin-replace": "https://cdn.jsdelivr.net/npm/@rollup/plugin-replace@5.0.4/types/index.d.ts",
		"$terser": "https://cdn.jsdelivr.net/npm/terser@5.16.0/tools/terser.d.ts",
	},
	logLevel: "WARNING",
});

if (!Deno.args.includes("--no-init")) {
	const gameServer = initGameServer({
		arenaWidth: 40,
		arenaHeight: 40,
		pitWidth: 16,
		pitHeight: 16,
		gameMode: "default",
		hooks: {
			async authenticatePlayer({ token }) {
				const safeToken = typeof token == "string" && token.length > 0 ? token : crypto.randomUUID();
				return {
					success: true,
					playerName: `Dev-${safeToken.slice(0, 6)}`,
					telegramId: 10_000 + Math.floor(Math.random() * 1_000_000),
					userId: crypto.randomUUID(),
					depositTier: 1,
					plusSkinsAllowed: true,
					isSpectator: false,
					hasExtraLife: false,
					metadata: {
						isDev: true,
					},
				};
			},
		},
	});
	// @ts-ignore
	globalThis.gameServer = gameServer;

	const persistentStoragePath = resolve("serverManager/persistentStorage.json");
	const serverManager = initServerManager({
		persistentStoragePath,
		websocketAuthToken: INSECURE_LOCALHOST_SERVERMANAGER_TOKEN,
	});

	/** Directories that should be served using serveDir() */
	const serveRootDirs = [
		"adminPanel",
		"shared",
		"deps",
		"client",
	];

	Deno.serve({
		port: 8080,
	}, async (request, info) => {
		const url = new URL(request.url);
		if (url.pathname == "/") {
			return Response.redirect(new URL("/client/", request.url), 302);
		} else if (url.pathname == "/gameserver") {
			return gameServer.websocketManager.handleRequest(request, info);
		} else if (url.pathname.startsWith("/servermanagerToken")) {
			return new Response(INSECURE_LOCALHOST_SERVERMANAGER_TOKEN);
		} else if (url.pathname.startsWith("/servermanager")) {
			return serverManager.handleRequest(request, info);
		} else if (url.pathname == "/about" || url.pathname == "/about.html") {
			const aboutHtml = await Deno.readTextFile(resolve("client/about.html"));
			return new Response(aboutHtml, {
				headers: {
					"Content-Type": "text/html",
				},
			});
		} else if (url.pathname == "/leaderboards" || url.pathname == "/leaderboards.html") {
			const leaderboardsHtml = await Deno.readTextFile(resolve("client/leaderboards.html"));
			return new Response(leaderboardsHtml, {
				headers: {
					"Content-Type": "text/html",
				},
			});
		} else if (url.pathname == "/privacy" || url.pathname == "/privacy.html") {
			const privacyHtml = await Deno.readTextFile(resolve("client/privacy.html"));
			return new Response(privacyHtml, {
				headers: {
					"Content-Type": "text/html",
				},
			});
		}

		for (const dir of serveRootDirs) {
			if (url.pathname.startsWith(`/${dir}/`)) {
				return await serveDir(request, {
					quiet: true,
					showDirListing: true,
				});
			}
		}
		return new Response("not found", { status: 404 });
	});
}
