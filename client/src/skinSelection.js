import { SKIN_BLOCK_COUNT, SKIN_PATTERN_COUNT, VIEWPORT_RADIUS } from "./constants.js";
import {
	canOpenSkinSelection,
	ctxApplyCamTransform,
	doTransition,
	drawBlocks,
	fillArea,
	getBlock,
	hideBeginScreen,
	showBeginScreen,
} from "./main.js";
import { lsSet, mod } from "./util.js";

let skinButtonCanvas, skinButtonCtx, skinButtonBlocks = [];
let skinCanvas, skinCtx, skinScreen, skinScreenVisible = false, skinScreenBlocks;

function setExitButtonVisible(isVisible) {
	const backToAppButton = document.getElementById("backToAppButton");
	if (!backToAppButton) return;
	backToAppButton.style.display = isVisible ? null : "none";
}

/**
 * @param {string} key
 */
function getStorageItem(key) {
	const stringValue = localStorage.getItem(key);
	if (stringValue == null) return 0;
	const intValue = parseInt(stringValue);
	if (isNaN(intValue)) return 0;
	return intValue;
}

let selectedColor = getStorageItem("skinColor");
let selectedPattern = getStorageItem("skinPattern");

export function getSkinColor() {
	return selectedColor;
}

export function getSkinPattern() {
	return selectedPattern;
}

/**
 * @param {number} colorId
 */
export function setSkinColor(colorId) {
	selectedColor = colorId;
	lsSet("skinColor", colorId);
	updateScreenBackground();
	updateSkinLockIcons();
}

/**
 * @param {number} patternId
 */
export function setSkinPattern(patternId) {
	selectedPattern = patternId;
	lsSet("skinPattern", patternId);
	updateScreenBackground();
	updateSkinLockIcons();
}

window.addEventListener("load", () => {
	skinScreen = document.getElementById("skinScreen");
	skinCanvas = document.getElementById("skinScreenCanvas");
	skinCtx = skinCanvas.getContext("2d");
});

export async function initSkinScreen() {
	skinButtonCanvas = document.getElementById("skinButton");
	skinButtonCtx = skinButtonCanvas.getContext("2d");
	skinButtonCanvas.onclick = function () {
		if (canOpenSkinSelection()) {
			updateSkinLockIcons();
			doTransition("", false, openSkinScreen);
		}
	};

	skinScreenBlocks = [];
	fillArea(0, 0, VIEWPORT_RADIUS * 2, VIEWPORT_RADIUS * 2, selectedColor + 1, selectedPattern, skinScreenBlocks);

	document.getElementById("prevColor").onclick = function () {
		skinButton(-1, 0);
	};
	document.getElementById("nextColor").onclick = function () {
		skinButton(1, 0);
	};
	document.getElementById("prevPattern").onclick = function () {
		skinButton(-1, 1);
	};
	document.getElementById("nextPattern").onclick = function () {
		skinButton(1, 1);
	};
	document.getElementById("skinSave").onclick = function () {
		doTransition("", false, showBeginHideSkin);
	};
	document.getElementById("skinBackButton").onclick = function () {
		doTransition("", false, showBeginHideSkin);
	};

	// Listen for language changes to update back button text
	document.addEventListener("languageChanged", updateBackButtonText);

	var block = getBlock(0, 0, skinButtonBlocks);
	block.setBlockId(selectedColor + 1, false);

	skinButtonCanvas.onmouseover = function () {
		if (selectedColor > 0) {
			skinButtonBlocks[0].setBlockId(selectedColor + 1 + SKIN_BLOCK_COUNT, false);
		}
	};
	skinButtonCanvas.onmouseout = function () {
		skinButtonBlocks[0].setBlockId(selectedColor + 1, false);
	};
}

export function renderSkinButton() {
	if (!skinButtonCtx) return;

	ctxApplyCamTransform(skinButtonCtx, true, true);

	drawBlocks(skinButtonCtx, skinButtonBlocks);
	skinButtonCtx.restore();
}

export function renderSkinScreen() {
	ctxApplyCamTransform(skinCtx, true);

	drawBlocks(skinCtx, skinScreenBlocks);
	skinCtx.restore();
}

export function getSkinScreenVisible() {
	return skinScreenVisible;
}

function openSkinScreen() {
	hideBeginScreen();
	showSkinScreen();
}

function showBeginHideSkin() {
	showBeginScreen();
	hideSkinScreen();
}

function updateBackButtonText() {
	const backButton = document.getElementById("skinBackButton");
	if (!backButton) return;
	
	// Get localized text
	let text = "Назад"; // Default Russian
	if (window.i18n && typeof window.i18n.getCurrentLanguage === "function") {
		const lang = window.i18n.getCurrentLanguage();
		text = lang === "en" ? "Back" : "Назад";
	}
	
	backButton.textContent = text;
}

function showSkinScreen() {
	skinScreenVisible = true;
	skinScreen.style.display = null;
	setExitButtonVisible(false);
	
	// Force apply styles and text to back button (for Telegram Mini App compatibility)
	const backButton = document.getElementById("skinBackButton");
	if (backButton) {
		// Force apply styles
		backButton.style.cssText = "position: fixed !important; top: 10px !important; left: 10px !important; z-index: 100 !important; background-color: #666666 !important; background: #666666 !important; color: white !important; border: none !important; border-radius: 6px !important; padding: 8px 16px !important; font-size: 14px !important; font-weight: 600 !important; cursor: pointer !important; box-shadow: 1px 1px #444444, 2px 2px #444444, 3px 3px #444444, 5px 10px 30px rgba(0, 0, 0, 0.3) !important;";
		
		// Set text with localization
		updateBackButtonText();
	}
}

export function hideSkinScreen() {
	skinScreenVisible = false;
	skinScreen.style.display = "none";
	setExitButtonVisible(true);
}

//called when a skinbutton is pressed
//add = -1 or 1 (increment/decrement)
//type = 0 (color) or 1 (pattern)
function skinButton(add, type) {
	if (type === 0) {
		var oldC = selectedColor;
		var hiddenCs = [];
		if (oldC === null) {
			oldC = 0;
		}
		oldC = parseInt(oldC);
		var cFound = false;
		while (!cFound) {
			oldC += add;
			oldC = mod(oldC, SKIN_BLOCK_COUNT + 1);
			if (hiddenCs.indexOf(oldC) < 0) {
				cFound = true;
			}
		}
		setSkinColor(oldC);
	} else if (type == 1) {
		var oldP = selectedPattern;
		var hiddenPs = [18, 19, 20, 21, 23, 24, 25, 26];
		if (oldP === null) {
			oldP = 0;
		}
		oldP = parseInt(oldP);
		var pFound = false;
		while (!pFound) {
			oldP += add;
			oldP = mod(oldP, SKIN_PATTERN_COUNT);
			if (hiddenPs.indexOf(oldP) < 0) {
				pFound = true;
			}
		}
		setSkinPattern(oldP);
	}
}

function updateScreenBackground() {
	const blockId = selectedColor + 1;
	fillArea(
		0,
		0,
		VIEWPORT_RADIUS * 2,
		VIEWPORT_RADIUS * 2,
		blockId,
		selectedPattern,
		skinScreenBlocks,
	);
	skinButtonBlocks[0].setBlockId(blockId);
}

const colorPlusIcon = document.getElementById("colorPlusIcon");
const patternPlusIcon = document.getElementById("patternPlusIcon");
const colorLockIcon = document.getElementById("colorLockIcon");
const patternLockIcon = document.getElementById("patternLockIcon");

function updateSkinLockIcons() {
	// All skins are now free, so hide all lock icons
	colorPlusIcon.style.display = "none";
	colorLockIcon.style.display = "none";
	patternPlusIcon.style.display = "none";
	patternLockIcon.style.display = "none";
}
