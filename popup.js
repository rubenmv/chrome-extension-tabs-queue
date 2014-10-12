/*global chrome, FileReader, window, document, console*/

var bgPage = chrome.extension.getBackgroundPage();

function openItemInCurrentTab(event) {
	'use strict';
	event.preventDefault();
	var liElement = event.target;
	chrome.tabs.update({
		url: liElement.textContent
	});
	// Remove element from queue
	bgPage.urlQueue.splice(liElement.value, 1);
	bgPage.updateBadgeCounter();
	window.close();
}

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
			//aElement = document.createElement('a');
			//aElement.href = urlArray[i];
			//aElement.textContent = urlArray[i];
			//liElement.appendChild(aElement);
			urlList.appendChild(liElement);

			// Finally add listener to close popup and open link in active tab
			liElement.addEventListener('click', openItemInCurrentTab);
		}
	} else {
		info.textContent = 'Queue is empty';
	}
}
document.addEventListener('DOMContentLoaded', getBackgroundInfo);