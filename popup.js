/*global chrome, FileReader, window, document, console*/

var bgPage = chrome.extension.getBackgroundPage();
var queueId = null;

/**
 * Opens clicked item on current tab
 * @param  {Object} event [Event received on click]
 */
function openItemInCurrentTab(event) {
  'use strict';
  if(event.target.className !== 'item-url') {
    event.stopPropagation();
    return;
  }
  chrome.tabs.update({
    url: event.target.textContent
  });
  // Remove element from queue and storage
  // value (int) was added on getBackgroundInfo() when creating li elements
  bgPage.removeItem(event.target.parentNode.value); // index
  event.stopPropagation();
  window.close();
}

/**
 * Update index/value attribute on list items and update queue
 */
function reindex(oldPos, newPos) {
  var items = document.getElementById('url-list').getElementsByClassName('list-item');
  for (var i = 0; i < items.length; i++) {
    items[i].value = i;
  }
  // queue id, old positio, new position
  bgPage.moveItemInQueue(queueId, oldPos, newPos);
}

/**
 * Gets data from background page
 */
function getBackgroundInfo() {
  'use strict';
  chrome.windows.getLastFocused(function (windowInfo) {
    queueId = windowInfo.id;
    var info = document.getElementById('url-list-info'),
      urlList = document.getElementById('url-list'),
      urlArray = bgPage.getQueue(queueId).items,
      liElement;
    if (urlArray.length > 0) {
      //var list = document.getElementById("my-ui-list");
      //Sortable.create(urlList); // That's all.
      Sortable.create(urlList, {
        animation: 150, // ms, animation speed moving items when sorting, `0` — without animation
        handle: '.handle', // Restricts sort start click/touch to the specified element
        onEnd: function (evt) {
          reindex(evt.oldIndex, evt.newIndex);
        }
      });

      info.textContent = 'Items in queue';
      for (var i = 0; i < urlArray.length; i++) {
        // List element
        liElement = document.createElement('li');
        liElement.setAttribute('class', 'list-item');
        // Handle and link
        var handle = document.createElement('span');
        handle.setAttribute('class', 'handle');
        handle.textContent = '☰  ';
        var urlSpan = document.createElement('span');
        urlSpan.setAttribute('class', 'item-url');
        urlSpan.textContent = urlArray[i].url;
        // Append both in order
        liElement.appendChild(handle);
        liElement.appendChild(urlSpan);
        liElement.value = i; // To be able to remove it from the background page queue
        // Append item to list
        urlList.appendChild(liElement);

        // Finally add listener to close popup and open link in active tab
        urlList.addEventListener('click', openItemInCurrentTab);
      }
    } else {
      info.textContent = 'Queue is empty';
    }
  });

  // After init add the other listeners
  var switchButton = document.getElementById('myonoffswitch');
  switchButton.checked = bgPage.isActive;
  //document.getElementById('button-openall').addEventListener('click', clearAll);
  document.getElementById('button-clear').addEventListener('click', toggleClearConfirm);
  // Listener for clear confirm dialog
  document.getElementById('clearYes').addEventListener('click', clearAll);
  document.getElementById('clearNo').addEventListener('click', toggleClearConfirm);
  document.getElementById('clearConfirm').style.display = 'none';
  //document.getElementById('button-queueall').addEventListener('click', bgPage.queueAllTabs);
  switchButton.addEventListener('change', onSwitchChanged);
}

/**
 * Ask for confirmation and calls clear all items
 */
function toggleClearConfirm() {
  var clearButton = document.getElementById('button-clear');
  var confirmDialog = document.getElementById('clearConfirm');
  
  clearButton.style.display = clearButton.style.display !== 'none' ? 'none' : 'inline-block'; 
  confirmDialog.style.display = confirmDialog.style.display !== 'none' ? 'none' : 'inline-block'; 
}

function clearAll() {
  bgPage.clearItems();
  window.close();
}

function onSwitchChanged(e) {
  bgPage.setActive(e.target.checked);
}

document.addEventListener('DOMContentLoaded', getBackgroundInfo);
