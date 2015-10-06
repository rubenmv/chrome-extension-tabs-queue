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

  chrome.windows.getLastFocused(function (windowInfo) {
    var info = document.getElementById('url-list-info'),
      urlList = document.getElementById('url-list'),
      //urlArray = bgPage.urlQueue,
      urlArray = bgPage.getQueue(windowInfo.id).items,
      liElement;
    if (urlArray.length > 0) {
      info.textContent = 'Items in queue';
      for (var i = 0; i < urlArray.length; i++) {
        // List element
        liElement = document.createElement('li');
        liElement.textContent = urlArray[i].url;
        liElement.value = i; // To be able to remove it from the background page queue
        urlList.appendChild(liElement);

        // Finally add listener to close popup and open link in active tab
        liElement.addEventListener('click', openItemInCurrentTab);
      }
    } else {
      info.textContent = 'Queue is empty';
    }
  });

  // After init add the other listeners
  var switchButton = document.getElementById('myonoffswitch');
  switchButton.checked = bgPage.isActive;
  //document.getElementById('button-openall').addEventListener('click', clearAll);
  document.getElementById('button-clear').addEventListener('click', clearAll);
  document.getElementById('button-queueall').addEventListener('click', bgPage.queueAllTabs);
  document.getElementById('myonoffswitch').addEventListener('change', onSwitchChanged);
}

function clearAll() {
  bgPage.clearItems();
  window.close();
}

function onSwitchChanged(e) {
  bgPage.setActive(e.target.checked);
}

document.addEventListener('DOMContentLoaded', getBackgroundInfo);
