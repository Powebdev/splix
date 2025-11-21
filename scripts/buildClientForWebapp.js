import { rollup } from "$rollup";
import replace from "$rollup-plugin-replace";
import { terser } from "../shared/rollup-terser-plugin.js";
import { resolve } from "$std/path/mod.ts";
import { copy, ensureDir } from "$std/fs/mod.ts";
import * as streams from "$std/streams/mod.ts";
import * as path from "$std/path/mod.ts";
import * as fs from "$std/fs/mod.ts";
import { Tar } from "$std/archive/tar.ts";
import { setCwd } from "chdir-anywhere";
setCwd();

Deno.chdir("../client");

const versionArg = Deno.args[0] || "0.0.0";

const outDir = resolve("./out");
const distDir = resolve(outDir, "./dist");

try {
	await Deno.remove(outDir, { recursive: true });
} catch {
	// Already removed
}
await ensureDir(distDir);

console.log("[build-webapp] Building client bundle...");

const bundle = await rollup({
	input: [
		"src/main.js",
		"src/leaderboards.js",
	],
	onwarn: (message) => {
		if (message.code == "CIRCULAR_DEPENDENCY") return;
		console.error(message.message);
	},
	plugins: [
		replace({
			values: {
				IS_DEV_BUILD: JSON.stringify(false),
				CLIENT_VERSION: JSON.stringify(versionArg),
			},
			preventAssignment: true,
		}),
	],
});
const { output } = await bundle.write({
	dir: resolve(distDir, "bundle"),
	format: "esm",
	entryFileNames: "[name]-[hash].js",
	plugins: [
		terser({
			module: true,
		}),
	],
});

const originalBundleEntryPoint = path.resolve("src/main.js");
const leaderboardsBundleEntryPoint = path.resolve("src/leaderboards.js");

let mainEntryPoint = null;
let leaderboardsEntryPoint = null;
for (const chunk of output) {
	if (chunk.type == "chunk") {
		if (chunk.facadeModuleId == originalBundleEntryPoint) {
			mainEntryPoint = chunk.fileName;
		} else if (chunk.facadeModuleId == leaderboardsBundleEntryPoint) {
			leaderboardsEntryPoint = chunk.fileName;
		}
	}
}
if (!mainEntryPoint) {
	throw new Error("Assertion failed, unable to find main entry point in generated bundle.");
}
if (!leaderboardsEntryPoint) {
	throw new Error("Assertion failed, unable to find leaderboards entry point in generated bundle.");
}

// Read and process index.html for webapp
let indexContent = await Deno.readTextFile("index.html");
// Update paths to work with /game/ prefix in webapp
indexContent = indexContent.replace(/src="\.\/bundle\//g, 'src="/game/bundle/');
indexContent = indexContent.replace(/href="\.\/static\//g, 'href="/game/static/');
indexContent = indexContent.replace(/src="\.\/src\//g, 'src="/game/src/');
indexContent = indexContent.replace("./src/main.js", "/game/bundle/" + mainEntryPoint);
indexContent = indexContent.replace("./static/style.css", "/game/static/style.css?" + Date.now());
await Deno.writeTextFile(resolve(distDir, "index.html"), indexContent);

// Process leaderboards.html
let leaderboardsContent = await Deno.readTextFile("leaderboards.html");
leaderboardsContent = leaderboardsContent.replace(/src="\.\/bundle\//g, 'src="/game/bundle/');
leaderboardsContent = leaderboardsContent.replace(/href="\.\/static\//g, 'href="/game/static/');
leaderboardsContent = leaderboardsContent.replace("./src/leaderboards.js", "/game/bundle/" + leaderboardsEntryPoint);
leaderboardsContent = leaderboardsContent.replace(
	"./static/leaderboards.css",
	"/game/static/leaderboards.css?" + Date.now(),
);
await Deno.writeTextFile(resolve(distDir, "leaderboards.html"), leaderboardsContent);

// Copy other HTML files
await copy("about.html", resolve(distDir, "about.html"));
await copy("flags.html", resolve(distDir, "flags.html"));
await copy("privacy.html", resolve(distDir, "privacy.html"));
await copy("static", resolve(distDir, "static"));
await copy("json", resolve(distDir, "json"));

console.log("[build-webapp] Client build complete!");

// Now copy to webapp/static
const webappStaticDir = resolve("../../webapp/static");
console.log(`[build-webapp] Copying to webapp: ${webappStaticDir}`);

// Ensure webapp static directory exists
await ensureDir(webappStaticDir);

// Copy all files from dist to webapp/static
try {
	// Copy bundle directory
	const sourceBundleDir = resolve(distDir, "bundle");
	const targetBundleDir = resolve(webappStaticDir, "bundle");
	await ensureDir(targetBundleDir);

	// Remove old bundle files
	try {
		for await (const entry of Deno.readDir(targetBundleDir)) {
			if (entry.isFile && entry.name.startsWith("main-") || entry.name.startsWith("leaderboards-") || entry.name.startsWith("globals-")) {
				await Deno.remove(resolve(targetBundleDir, entry.name));
			}
		}
	} catch (e) {
		// Directory might not exist yet
	}

	await copy(sourceBundleDir, targetBundleDir, { overwrite: true });

	// Copy static directory
	const sourceStaticDir = resolve(distDir, "static");
	const targetStaticDir = resolve(webappStaticDir, "static");
	await copy(sourceStaticDir, targetStaticDir, { overwrite: true });

	// Copy src directory (i18n.js from client/src/)
	const sourceSrcDir = resolve("src"); // client/src directory
	const targetSrcDir = resolve(webappStaticDir, "src");
	await ensureDir(targetSrcDir);

	// Only copy i18n.js
	try {
		await Deno.copyFile(resolve(sourceSrcDir, "i18n.js"), resolve(targetSrcDir, "i18n.js"));
		console.log("[build-webapp] ✅ Copied i18n.js");
	} catch (e) {
		console.warn("[build-webapp] ⚠️  Could not copy i18n.js:", e.message);
	}

	// Copy json directory
	const sourceJsonDir = resolve(distDir, "json");
	const targetJsonDir = resolve(webappStaticDir, "json");
	await copy(sourceJsonDir, targetJsonDir, { overwrite: true });

	// Copy HTML files
	await Deno.copyFile(resolve(distDir, "index.html"), resolve(webappStaticDir, "index.html"));
	await Deno.copyFile(resolve(distDir, "about.html"), resolve(webappStaticDir, "about.html"));
	await Deno.copyFile(resolve(distDir, "flags.html"), resolve(webappStaticDir, "flags.html"));
	await Deno.copyFile(resolve(distDir, "privacy.html"), resolve(webappStaticDir, "privacy.html"));
	await Deno.copyFile(resolve(distDir, "leaderboards.html"), resolve(webappStaticDir, "leaderboards.html"));

	console.log("[build-webapp] ✅ Successfully copied all files to webapp/static!");
	console.log("[build-webapp] Main bundle: " + mainEntryPoint);
	console.log("[build-webapp] Leaderboards bundle: " + leaderboardsEntryPoint);
} catch (error) {
	console.error("[build-webapp] ❌ Error copying to webapp:", error);
	throw error;
}

// Archive all files (for backwards compatibility with original script)
const tar = new Tar();
for await (const entry of fs.walk(distDir)) {
	if (entry.isFile) {
		const filenameInArchive = path.relative(distDir, entry.path);
		await tar.append(filenameInArchive, {
			filePath: resolve(distDir, entry.path),
		});
	}
}

const tarDestination = resolve("./out/client.tar");
const writer = await Deno.open(tarDestination, { write: true, create: true });
await streams.copy(tar.getReader(), writer);
writer.close();

console.log("[build-webapp] 🚀 Deploy ready! You can now restart pm2 processes.");

