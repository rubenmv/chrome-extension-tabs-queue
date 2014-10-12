/*global chrome, console, document*/
(function () {
	'use strict';

	var urlQueue = [],
		tabWaitQueue = [], // Tabs waiting for url update (before queuing)
		tabLimit = 4,
		// When a new tab is queued, it's instantly removed
		// this flag alerts not to open a new tab when this happens
		isQueuing = false,
		ICON_MAX_KEYS = 14,
		customUrlGlobal,
		domainGlobal,
		modeGlobal,
		notificationGlobal = {
			'show': '',
			'title': '',
			'text': '',
			'icon': ''
		};

	function initOptions() {
		//sync.get callback, data received
		function dataRetrieved(items) {
			// Check for error
			if (chrome.runtime.lastError !== undefined) {
				console.log("An error ocurred initializing options: " + chrome.runtime.lastError.string);
				return;
			}
			// Initialize
			customUrlGlobal = items.customUrl;
			domainGlobal = items.domain;
			modeGlobal = items.mode;
			notificationGlobal.show = items.notification.show;
			notificationGlobal.title = items.notification.title;
			notificationGlobal.text = items.notification.text;
			//Get icon parts and join them
			var iconString = '';
			for (var i = 0; i < ICON_MAX_KEYS; i++) {
				iconString += items['icon' + i];
			}
			notificationGlobal.icon = iconString;
			chrome.browserAction.setIcon({
				path: iconString
			});
		}


		// Set defaults
		var options = {};
		//Generate the keys for the icon
		options.customUrl = 'https://encrypted.google.com/';
		options.mode = 0;
		options.domain = ".*";
		options.notification = {
			'show': false,
			'title': 'Curtom Button',
			'text': 'URL doesn\'t match'
		};
		for (var i = 0; i < ICON_MAX_KEYS; i++) {
			//Clear the rest, in case the new icon is smaller
			options['icon' + i] = '';
		}
		options.icon0 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAAqElEQVR4nO3aQQrCQBBE0Y54/yOrW5GABI0fmfeWs2iKYtLMIjMAAMCKtpm5nzDz2afzT513+XDY31NAHaB23Tl7/ebe+fYO+anlb4AC6gC1vXeAHbASBdQBanvvgKOO7ozSNjO354Plb4AC6gA1BdQBagqoA9QUUAeoKaAOUFNAHaCmgDpATQF1gJoC6gA1BdQBagqoA9TO+Eforyx/AxRQBwAAACg8AEejCFAaFqVwAAAAAElFTkSuQmCC';
		// Get the items from storage (asynchronous)
		chrome.storage.sync.get(options, dataRetrieved);
	}

	function showPopupMenu() {
		// TODO: Opens popup menu with queue
	}

	// Settings changes
	function onSettingsChanged(changes, namespace) {
		var key, storageChange, newValue, fullIcon = '';
		for (key in changes) {
			if (changes.hasOwnProperty(key)) {
				storageChange = changes[key];
				newValue = storageChange.newValue;
				if (key === 'customUrl') {
					customUrlGlobal = newValue;
				} else if (key === 'mode') {
					modeGlobal = newValue;
				} else if (key === 'notification') {
					notificationGlobal.show = newValue.show;
					notificationGlobal.title = newValue.title;
					notificationGlobal.text = newValue.text;
				} else if (key === 'domain') {
					domainGlobal = storageChange.newValue;
				} else if (key.match(/^icon[0-9]{1,2}$/) !== null) { //if is icon key, add
					fullIcon += newValue;
				}
			}
		}
		if (fullIcon !== '') {
			notificationGlobal.icon = fullIcon;
			chrome.browserAction.setIcon({
				path: fullIcon
			});
		}
	}

	// Simply save the new tab id and check later when url gets updated
	// this fixes the problem with blank url when opening a link with target="_blank"
	function onCreatedTab(newTab) {
		tabWaitQueue.push(newTab.id);
	}

	function findTab() {

	}

	// New tab created, check limit and add to queue
	function onUpdatedTab(updatedTab) {
		var tabCount = 0;

		// Get tabs in current window
		chrome.tabs.query({
			windowId: chrome.windows.WINDOW_ID_CURRENT
		}, function (windowTabs) {
			tabCount = windowTabs.length;

			// If no limit exceeded, do nothing
			// else add to urlQueue
			if (tabCount <= tabLimit) {
				return;
			} else {
				// Queue new tab url and close it
				if (updatedTab.url !== '') {
					urlQueue.push(updatedTab.url);

					isQueuing = true;
					chrome.tabs.remove(updatedTab.id, function () {
						console.log('Tab limit exceeded, new tab added to queue!!\n' + urlQueue);
					});
				}
			}
		});
	}
	// Tab removed, check if there's something in the queue
	function onRemovedTab() {
		if (urlQueue.length > 0) {
			if (!isQueuing) {
				console.log('opening next in queue');
				chrome.tabs.create({
					url: urlQueue.shift(),
					active: false
				});
			}
			// Reset for the next one
			isQueuing = false;
		}
	}

	// LISTENERS
	// "OnLoad" listener to set the default options
	document.addEventListener('DOMContentLoaded', initOptions);
	chrome.browserAction.onClicked.addListener(showPopupMenu);
	chrome.storage.onChanged.addListener(onSettingsChanged);
	chrome.tabs.onCreated.addListener(onCreatedTab);
	chrome.tabs.onRemoved.addListener(onRemovedTab);
	chrome.tabs.onUpdated.addListener(onUpdatedTab);
}());
