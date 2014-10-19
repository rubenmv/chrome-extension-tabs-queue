/*global chrome, console, document*/
var urlQueue = [],
	tabsWaitingArray = [], // Tabs waiting for url update (before queuing)
	tabLimit = 10,
	// When a new tab is queued, it's instantly removed
	// this flag alerts not to open a new tab when this happens
	isQueuing = false,
	// Regular expressions for url exclusions
	whitelist = [/^chrome[:|-].*/],
	ICON_MAX_KEYS = 14,
	ICON_DEFAULT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAAqElEQVR4nO3aQQrCQBBE0Y54/yOrW5GABI0fmfeWs2iKYtLMIjMAAMCKtpm5nzDz2afzT513+XDY31NAHaB23Tl7/ebe+fYO+anlb4AC6gC1vXeAHbASBdQBanvvgKOO7ozSNjO354Plb4AC6gA1BdQBagqoA9QUUAeoKaAOUFNAHaCmgDpATQF1gJoC6gA1BdQBagqoA9TO+Eforyx/AxRQBwAAACg8AEejCFAaFqVwAAAAAElFTkSuQmCC';

/**
 * Updates counter in browser action icon/button
 */
function updateBadgeCounter() {
	var badgeColor = '#00ff00';
	if (urlQueue.length > 0) {
		badgeColor = '#ff0000';
	}

	chrome.browserAction.setBadgeBackgroundColor({
		color: badgeColor
	});

	chrome.browserAction.setBadgeText({
		text: urlQueue.length.toString()
	});
}

function initOptions() {
	document.removeEventListener('DOMContentLoaded');
	//sync.get callback, data received
	function optionsDataRetrieved(items) {
		// Check for error
		if (chrome.runtime.lastError !== undefined) {
			console.log("An error ocurred initializing options: " + chrome.runtime.lastError.string);
			return;
		}
		// Initialize properties
		if(items.hasOwnProperty('tabLimit')) {
			tabLimit = items.tabLimit;
		}
		//Get icon parts and join them
		var iconString = '';
		if(items.hasOwnProperty('icon1')) {
			// Retrieve icon data
			for (var i = 0; i < ICON_MAX_KEYS; i++) {
				if(items.hasOwnProperty('icon' + i)) {
					iconString += items['icon' + i];
				} else {
					break; // No key found, icon is complete
				}
			}
		}
		else {
			// Default icon
			iconString = ICON_DEFAULT;
		}
		chrome.browserAction.setIcon({
			path: iconString
		});
	}
	// local.get callback, queue state
	function queueDataRetrieved(items) {
		
		// Fill queue
		if (items.hasOwnProperty('queueLength')) {
			for (var i = 0; i < items.queueLength; i++) {
				urlQueue.push(items['item'+i]);
			}
		}
		// Badge counter
		updateBadgeCounter();
	}

	// Get the options from sync storage
	chrome.storage.sync.get(null, optionsDataRetrieved);
	// Get queue state from local storage
	chrome.storage.local.get(null, queueDataRetrieved);
}
// Settings changes
function onSettingsChanged(changes, namespace) {
	var key, storageChange, newValue, fullIcon = '';
	for (key in changes) {
		if (changes.hasOwnProperty(key)) {
			storageChange = changes[key];
			newValue = storageChange.newValue;
			if (key === 'tabLimit') {
				tabLimit = newValue;
			} else if (key.match(/^icon[0-9]{1,2}$/) !== null) { //if is icon key, add
				fullIcon += newValue;
			}
		}
	}
	if (fullIcon !== '') {
		chrome.browserAction.setIcon({
			path: fullIcon
		});
	}
}

/**
 * Push new url to queue and save it in local storage
 * @param  {string} url [New url to queue]
 */
function saveItem(url) {
	// Push to queue
	urlQueue.push(url);
	// Add to storage
	var itemIndex = urlQueue.length - 1,
		values = {};

	// Set new length
	values['queueLength'] = urlQueue.length;
	// Add new item
	values['item' + itemIndex] = url;
	chrome.storage.local.set(values, function () {
		// Check for error
		if (chrome.runtime.lastError !== undefined) {
			console.error("An error ocurred saving item: " + chrome.runtime.lastError.string);
			console.error(chrome.runtime.lastError);
		}
	});

	updateBadgeCounter();
}

/**
 * Removes item from queue and storage
 * @param  {int} index [Item's index in queue]
 */
function removeItem(index) {
	/*
	// Remove from queue
	urlQueue.splice(index, 1);
	// Clear local storage (it only keeps the saved queue)
	chrome.storage.local.clear(function () {
		// Check for error
		if (chrome.runtime.lastError !== undefined) {
			console.error("An error ocurred removing item from storage: " + chrome.runtime.lastError.string);
			console.error(chrome.runtime.lastError);
		}

		// Save the current queue
		var items = {};
		items.queueLength = urlQueue.length;
		for (var i = 0; i < urlQueue.length; i++) {
			items['item' + i] = urlQueue[i];
		}
		chrome.storage.local.set(items, function () {
			// Check for error
			if (chrome.runtime.lastError !== undefined) {
				console.error("An error ocurred removing item from storage: " + chrome.runtime.lastError.string);
				console.error(chrome.runtime.lastError);
			}
		});		
	});
*/
	
	// Not the last index, rearange queue
	var lastIndex = urlQueue.length - 1;
	var newValues = {};
	newValues['queueLength'] = lastIndex;
	if ( index <  lastIndex) {
		for (var i = index; i < lastIndex; i++) {
			newValues['item' + i] = urlQueue[i+1]; //current item = next item
		}
	}

	chrome.storage.local.set(newValues, function() {
		// Remove last item, now is duplicated
		var lastItem = 'item' + lastIndex;
		chrome.storage.local.remove(lastItem);
	});

	// Remove from queue
	urlQueue.splice(index, 1);
	updateBadgeCounter();
}
// Check if tab is on the wait list (new) and remove it
function findRemoveTabWaiting(tabId) {
	for (var i = 0; i < tabsWaitingArray.length; i++) {
		if (tabId === tabsWaitingArray[i]) {
			tabsWaitingArray.splice(i, 1);
			return true;
		}
	}
	return false;
}
// Check if the url matches something in whitelist
function isInWhitelist(string) {
	for (var i = 0; i < whitelist.length; i++) {
		if (whitelist[i].test(string)) {
			return true;
		}
	}
	return false;
}

/**
 * Removes all items in queue
 */
function clearItems() {
	urlQueue = [];
	chrome.storage.local.clear();
	updateBadgeCounter();
}

// Simply save the new tab id and check later when url gets updated
// this fixes the problem with blank url when opening a link with target="_blank"
function onCreatedTab(newTab) {
	tabsWaitingArray.push(newTab.id);

}
// New tab created, check limit and add to queue
function onUpdatedTab(tabId, tabInfo) {
	//Pinned tab = removed tab
	if(tabInfo.pinned) {
		onRemovedTab();
		return;
	}
	//First check if the updated tab is one of the new ones
	//or if it's pinned
	
	if (!findRemoveTabWaiting(tabId)) {
		return;
	}
	// Get tabs in current window
	chrome.tabs.query({
		windowId: chrome.windows.WINDOW_ID_CURRENT
	}, function (windowTabs) {
		// Get number of opened tabs, whitelisted and pinned excluded
		var tabCount = 0;
		for (var i = 0; i < windowTabs.length; i++) {
			if (!isInWhitelist(windowTabs[i].url) && !windowTabs[i].pinned) {
				tabCount++;
			}
		}
		// If no limit exceeded, do nothing
		// else add to urlQueue
		if (tabCount <= tabLimit) {
			return;
		} else {
			// Queue new tab url and close it
			if (!isInWhitelist(tabInfo.url)) {
				// Save to queue and local storage
				saveItem(tabInfo.url);
				isQueuing = true;
				chrome.tabs.remove(tabId);
			}
		}
	});
}

// Tab removed, check if there's something in the queue
function onRemovedTab() {
	// Check how many tabs can we create
	chrome.tabs.query({
		windowId: chrome.windows.WINDOW_ID_CURRENT
	}, function (windowTabs) {
		// Get number of opened tabs, whitelisted and pinned excluded
		var tabCount = 0;
		for (var i = 0; i < windowTabs.length; i++) {
			if (!isInWhitelist(windowTabs[i].url) && !windowTabs[i].pinned) {
				tabCount++;
			}
		}
		var freeSpace = tabLimit - tabCount;
		// Free space and items waiting
		if (freeSpace > 0 && urlQueue.length > 0) {
			if (!isQueuing) {
				// Create as many tabs as possible
				// First create the tabs, then remove the items from queue
				// after ALL new tabs have been created
				for (i = 0; i < freeSpace && i < urlQueue.length; i++) {
					chrome.tabs.create({
						url: urlQueue[i],
						active: false
					});
				}
				
				for (i = 0; i < freeSpace && i < urlQueue.length; i++) {
					removeItem(i);
				}
			}
		}
		// Reset for the next one
		isQueuing = false;
	});
}
// LISTENERS
// "OnLoad" listener to set the default options
document.addEventListener('DOMContentLoaded', initOptions);
chrome.storage.onChanged.addListener(onSettingsChanged);
chrome.tabs.onCreated.addListener(onCreatedTab);
chrome.tabs.onRemoved.addListener(onRemovedTab);
chrome.tabs.onUpdated.addListener(onUpdatedTab);