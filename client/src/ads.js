/**
 * Ad system - currently disabled.
 * Functions are kept as stubs for future ad integration.
 */

const adboxContainer = document.getElementById("adboxContainer");

/**
 * Show full screen ad. Currently a no-op, kept for future integration.
 */
export async function showFullScreenAd() {
	// Ads are disabled - do nothing
	return;
}

/**
 * Refresh banner ad. Currently hides the banner container, kept for future integration.
 */
export function refreshBanner() {
	if (adboxContainer) {
		adboxContainer.style.display = "none";
	}
}

/**
 * Update ad system. Currently ads are disabled, but structure is kept for future integration.
 * @param {any} _unused - Kept for API compatibility
 */
export function updateAdlad(_unused) {
	// Ads are disabled - just refresh banner to hide it
	refreshBanner();
}
