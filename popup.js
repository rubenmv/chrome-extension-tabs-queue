/*global chrome, FileReader, window, document, console*/

var bgPage = chrome.extension.getBackgroundPage();
var queueId = null;

/**
 * Opens clicked item on current tab
 * @param  {Object} event [Event received on click]
 */
function openItemInCurrentTab(event) {
  'use strict';
  if (event.target.className !== 'item-url') {
    event.stopPropagation();
    return;
  }
  chrome.tabs.update({
    url: event.target.textContent
  });
  // Remove element from queue and storage, only if not locked
  // value (int) was added on getBackgroundInfo() when creating li elements
  var parent = event.target.parentNode;
  var lock = parent.getElementsByClassName('item-lock')[0];
  if(lock && lock.getAttribute('data-checked') === 'false') {
    bgPage.removeItem(parent.value); // index
  }
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
 * Show/hide remove button on queue item
 */
function toggleRemoveButton(e) {
  var remove = e.target.getElementsByClassName('item-remove')[0];
  remove.style.display = remove.style.display === 'none' ? 'inline' : 'none';
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

/**
 * Enable/disable item lock 
 */
function toggleLock(e) {
  var liElement = e.target.parentNode;
  var state = false;
  if(e.target.getAttribute('data-checked') === 'false') { // toggle
    state = true;
  }
  e.target.setAttribute('data-checked', state.toString());
  var image = state ? 'images/lock-enabled.png' : 'images/lock-disabled.png';
  e.target.setAttribute('src', image);
  bgPage.setLock(liElement.value, state);
}

function clearAll() {
  bgPage.clearItems();
  window.close();
}

function onSwitchChanged(e) {
  bgPage.setActive(e.target.checked);
}

/**
 * Remove item
 */
function removeItem(e) {
  var liElement = e.target.parentNode;
  liElement.parentNode.removeChild(liElement);
  bgPage.removeItem(liElement.value); // index
}

/**
 * Creates new queue item
 */
function createItem(index, url, locked) {
  // List element
  var liElement = document.createElement('li');
  liElement.setAttribute('class', 'list-item');
  // Handle and link
  var handle = document.createElement('span');
  handle.setAttribute('class', 'handle');
  handle.textContent = '☰  ';
  // Lock icon
  var lock = document.createElement('img');
  lock.setAttribute('class', 'item-lock');
  lock.setAttribute('data-checked', locked.toString());
  locked ? lock.setAttribute('src', 'images/lock-enabled.png') : lock.setAttribute('src', 'images/lock-disabled.png');
  lock.addEventListener('click', toggleLock);
  // Url
  var urlSpan = document.createElement('span');
  urlSpan.setAttribute('class', 'item-url');
  urlSpan.textContent = url;
  // Remove button
  var remove = document.createElement('span');
  remove.setAttribute('class', 'item-remove');
  remove.textContent = 'x  ';
  remove.style.display = 'none';
  remove.addEventListener('click', removeItem);
  // Append in order
  liElement.appendChild(handle);
  liElement.appendChild(lock);
  liElement.appendChild(lock);
  liElement.appendChild(urlSpan);
  liElement.appendChild(remove);
  liElement.value = index; // To be able to remove it from the background page queue
  // Add listeners to show/hide the remove item button
  liElement.addEventListener('mouseenter', toggleRemoveButton);
  liElement.addEventListener('mouseleave', toggleRemoveButton);

  return liElement;
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
      urlArray = bgPage.getQueue(queueId).items;
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
      console.log(urlArray);
      for (var i = 0; i < urlArray.length; i++) { 
        // Append item to list
        urlList.appendChild(createItem(i, urlArray[i].url, urlArray[i].locked));
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

document.addEventListener('DOMContentLoaded', getBackgroundInfo);
