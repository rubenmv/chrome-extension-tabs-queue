/*global chrome, FileReader, window, document, console*/

var bgPage = chrome.extension.getBackgroundPage();

/**
 * Opens clicked item on current tab
 * @param  {Object} event [Event received on click]
 */
function openItemInCurrentTab(event) {
	'use strict';
	event.preventDefault();
	var liElement = event.target;
	chrome.tabs.update({
		url: liElement.textContent
	});
	// Remove element from queue and storage
	// value (int) was added on getBackgroundInfo() when creating li elements
	bgPage.removeItem(liElement.value);
	window.close();
}

/**
 * Gets data from background page
 */
function getBackgroundInfo() {
	'use strict';
	var info = document.getElementById('url-list-info'),
		urlList = document.getElementById('url-list'),
		urlArray = bgPage.urlQueue,
		liElement, aElement;
	if (urlArray.length > 0) {
		info.textContent = 'Items in queue';
		for (var i = 0; i < urlArray.length; i++) {
			// List element
			liElement = document.createElement('li');
			liElement.textContent = urlArray[i];
			liElement.value = i; // To be able to remove it from the background page queue
			urlList.appendChild(liElement);

			// Finally add listener to close popup and open link in active tab
			liElement.addEventListener('click', openItemInCurrentTab);
		}
	} else {
		info.textContent = 'Queue is empty';
	}
}

function clearAll() {
	bgPage.clearItems();
	window.close();
}

document.addEventListener('DOMContentLoaded', getBackgroundInfo);
document.getElementById('button-clear').addEventListener('click', clearAll);