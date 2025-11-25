const serverSelectEl = /** @type {HTMLSelectElement} */ (document.getElementById("serverSelect"));

// Функция для перевода названий серверов
function translateServerName(displayName) {
	const serverNameMap = {
		"Игра на четверых": "server.fourPlayers",
		"Игра на двоих": "server.twoPlayers",
		"Тренировочный режим": "server.training",
	};

	const key = serverNameMap[displayName];
	if (key && window.i18n) {
		return window.i18n.t(key);
	}
	return displayName;
}

export async function initServerSelection() {
	let endPoint;
	// Всегда используем локальный ServerManager, чтобы показывались только ваши сервера
	{
		const url = new URL(location.href);
		url.pathname = "/servermanager/gameservers";
		url.search = "";
		url.hash = "";
		endPoint = url.href;
	}

	const response = await fetch(endPoint);
	/** @type {import("../../serverManager/src/ServerManager.js").ServersJson} */
	const servers = await response.json();

	while (serverSelectEl.firstChild) {
		serverSelectEl.firstChild.remove();
	}

	const officialGroup = document.createElement("optgroup");
	officialGroup.label = "Official";
	const unofficialGroup = document.createElement("optgroup");
	unofficialGroup.label = "Unofficial";

	/** @type {HTMLOptionElement[]} */
	const officialEndpoints = [];
	/** @type {HTMLOptionElement?} */
	let selectedEndpoint = null;
	const lastSelectedEndpoint = localStorage.getItem("lastSelectedEndpoint");
	const serverEndpoints = new Set(servers.servers.map((server) => server.endpoint));

	for (const server of servers.servers) {
		const optionEl = document.createElement("option");
		optionEl.value = server.endpoint;
		let textContent = translateServerName(server.displayName);
		if (server.playerCount > 0) {
			textContent += ` - ${server.playerCount}`;
		}
		optionEl.textContent = textContent;

		if (server.official) {
			officialEndpoints.push(optionEl);
			officialGroup.appendChild(optionEl);
		} else {
			unofficialGroup.appendChild(optionEl);
		}
		if (lastSelectedEndpoint && serverEndpoints.has(lastSelectedEndpoint)) {
			if (lastSelectedEndpoint === server.endpoint) {
				selectedEndpoint = optionEl;
			}
		} else if (server.recommended) {
			selectedEndpoint = optionEl;
		}
	}

	if (location.hash.indexOf("#ip=") == 0) {
		const optionEl = document.createElement("option");
		optionEl.value = location.hash.substring(4);
		optionEl.textContent = "From url";
		unofficialGroup.appendChild(optionEl);
		selectedEndpoint = optionEl;
	}

	if (!selectedEndpoint) {
		selectedEndpoint = officialEndpoints[0] || null;
	}

	if (officialGroup.childElementCount > 0) serverSelectEl.appendChild(officialGroup);
	if (unofficialGroup.childElementCount > 0) serverSelectEl.appendChild(unofficialGroup);

	if (selectedEndpoint) {
		serverSelectEl.value = selectedEndpoint.value;
		serverSelectEl.dispatchEvent(new Event("change", { bubbles: true }));
	}

	serverSelectEl.disabled = false;
	if (joinButton) {
		joinButton.disabled = false;
	}
}

export function getSelectedServer() {
	return serverSelectEl.value;
}
