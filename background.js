/*global chrome*/
"use strict";

var
  DEFAULT_ID = -1,
  whitelist = [/^chrome[:|-].*/],
  // Is extension active?
  isActive = true,
  // When a new tab is queued, it is instantly closed
  // this flag alerts not to open a new tab when this happens (onRemovedTab)
  isQueuing = false,
  // Tabs waiting for url update (before queuing)
  tabsWaitingArray = [],
  tabLimit = 10,
  allowDuplicates = false,
  queues = []; // Array of queued items

// Regular expressions for url exclusions
var ICON_DEFAULT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAAqElEQVR4nO3aQQrCQBBE0Y54/yOrW5GABI0fmfeWs2iKYtLMIjMAAMCKtpm5nzDz2afzT513+XDY31NAHaB23Tl7/ebe+fYO+anlb4AC6gC1vXeAHbASBdQBanvvgKOO7ozSNjO354Plb4AC6gA1BdQBagqoA9QUUAeoKaAOUFNAHaCmgDpATQF1gJoC6gA1BdQBagqoA9TO+Eforyx/AxRQBwAAACg8AEejCFAaFqVwAAAAAElFTkSuQmCC';
var ICON_DISABLED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABcVBMVEUAAAD/AAD///8AAAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAAAAAABAAADAAAGAAAKAAAPAAAVAAAcAAAiAAAjAAApAAAtAAA3AABCAABHAABQAABZAABjAABpAAB4AAB6AACHAACQAACbAACkAACxAAC9AAC/AADCAADIAADPAADXAADbAADjAADqAADuAADxAAD1AAD5AAD8AAD+AAD/AAB4L4E0AAAAUXRSTlMAAAABAQMFBgcJCgsMDQ8VFhweICUnKi0uNDY3QkNGTlJUVVhgYmVnaXh5iIuMj52foKGio66wsba5vb7CyMnKzM7W2drb4+bq6/Dz9ff5/P5esCL3AAABx0lEQVR42u3XR1MCQRCGYXoFs6yKGRRzzjlnESOOOeecxTy/Xl3Lni1Bl25ult9xtt7n1oe1aVHuHwgDgMVKm2OjArwB2ZkUBeCZkVL262wgd1J+bMTFBDL88nPjOSwgzSe/1ssB9GHsx1IVIMIM3hfyltKHfXBdGLO9L2Igrhv7h01BBxbasH/aEnRg/hT75x0RAthMCw8cY/+yJxjAocQdCAaw/4r9kWAAuy/YnwhrIGTbz9ifzYd8tQa2HrE/XxB0YOMe+8slQQdWg9jfLItIgG8HNKoOSDdebGox1oBzAHufC+hAvDqgiWygA44O7KfdQAfsjdjP5gMDqMU+UAwMoAr7uUpgABVzCFQBAygKYF8HDMAzi32TnQG4p7HvcAAdyPZj350AdCDdh/2gE+iAPmY+IDrgHFIHlAZ0ILEHe38W0AHTAU25gQ7YW9UBeYAB1KsDKgQGUK0OqBwYQKU0HRADKFEHVAMMoEAdUIOdAZgOqN0BJMDY5gP2F4si4iGwFsT+elnQgZU77G9XBAO4wj64KmiAZixn/OuAMuH3/fS/4Box+sk8YAKaPmAckMYGtOQuGfBqDAAX11KmWQP//41/EngDrVcKealcgDwAAAAASUVORK5CYII=';

/**
 * Queue class
 */
function Queue(windowId) {
  this.window = windowId,
  this.items = [];
}

/**
 * Item class. Contains info about the tab saved in queue.
 */
function Item(id, windowId, url, state, locked) {
  this.id = id,
  this.window = windowId, // original window/queue where it was created
  this.url = url,
  this.state = state;
  this.locked = locked;
}

// Adds move function to Array. Moves an item from one position to another
Array.prototype.move = function (oldIndex, newIndex) {
  while (oldIndex < 0) {
    oldIndex += this.length;
  }
  while (newIndex < 0) {
    newIndex += this.length;
  }
  if (newIndex >= this.length) {
    var k = newIndex - this.length;
    while ((k--) + 1) {
      this.push(undefined);
    }
  }
  this.splice(newIndex, 0, this.splice(oldIndex, 1)[0]);
  return this; // for testing purposes
};


/**
 * Save queues state to local storage
 */
function cleanAndStore() {
  // First cleanup
  var i = 0;
  while (i < queues.length) {
    // Reset id if window was closed
    
    
    // Remove empty queues
    if (queues[i].items.length === 0) {
      queues.splice(i, 1);
    }
    else {
      i++;
    }
  }
  // storage works only with strings
  var jsonQueues = JSON.stringify(queues);
  chrome.storage.local.set({ 'queues': jsonQueues }, function () {
    if (chrome.runtime.lastError !== undefined) {
      console.error("An error ocurred saving queues: " + chrome.runtime.lastError.string);
      console.error(chrome.runtime.lastError);
    }
  });
}

/**
 * Moves item position from specific queue
 */
function moveItemInQueue(queueId, oldPos, newPos) {
  var queue = getQueue(queueId).items;
  queue.move(oldPos, newPos);
  cleanAndStore();
}

/**
 * Change active state and browser action icon
 */
function setActive(active) {
  isActive = active;
  // Save to storage
  chrome.storage.local.set({ 'isActive': isActive });
  // Change icon
  var icon = isActive ? ICON_DEFAULT : ICON_DISABLED;
  
  // Check all queues and try to fill limit
  if (isActive) {
    for (var i = 0; i < queues.length; i++) {
      checkOpenNextItems(queues[i].window);
    }
  }

  chrome.browserAction.setIcon({
    path: icon
  });
  onRemovedTab();
}

/**
 * Returns the queue of a window. Creates one if it doesn't exists.
 */
function getQueue(windowId) {
  for (var i = 0; i < queues.length; i++) {
    if (queues[i].window == windowId) {
      return queues[i];
    }
  }
  // Not found: creates new queue
  var newQueue = new Queue(windowId);
  queues.push(newQueue);
  return newQueue;
}

/**
 * Updates counter in browser action icon/button
 */
function updateBadgeCounter() {
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    var currentTab = tabs[0];
    // Other window types like popup or app
    if (!currentTab) {
      return;
    }
    var badgeColor = '#00ff00';
    var currentQueue = getQueue(currentTab.windowId).items;
    if (currentQueue.length > 0) {
      badgeColor = '#ff0000';
    }
    chrome.browserAction.setBadgeBackgroundColor({
      "color": badgeColor,
    });
    chrome.browserAction.setBadgeText({
      "text": currentQueue.length.toString(),
      "tabId": currentTab.id
    });
  });
}

/**
 * Initialize settings and load queues
 */
function init() {
  document.removeEventListener('DOMContentLoaded');
  //sync.get callback, data received
  function optionsDataRetrieved(data) {
    // Check for error
    if (chrome.runtime.lastError !== undefined) {
      console.error('An error ocurred initializing options: ' + chrome.runtime.lastError.string);
      return;
    }
    // Initialize properties
    if (data.hasOwnProperty('tabLimit')) {
      tabLimit = data.tabLimit;
    }
    if (data.hasOwnProperty('allowDuplicates')) {
      allowDuplicates = data.allowDuplicates;
    }
    if (data.hasOwnProperty('isActive')) {
      isActive = data.isActive;
    }
    var iconPath = isActive ? ICON_DEFAULT : ICON_DISABLED;
    chrome.browserAction.setIcon({
      "path": iconPath
    });
    if (data.hasOwnProperty('queues')) {
      queues = JSON.parse(data.queues);
    }
    // Restore queues on start?
    if (data.hasOwnProperty('restoreOnStart') && data.restoreOnStart) {
      restoreAllQueues();
    }
  }
  // Get the options from sync storage
  chrome.storage.local.get(null, optionsDataRetrieved);
}

/**
 * Try to open next item in queue
 */
function checkOpenNextItems(windowId) {
  // Check how many tabs can we create
  chrome.tabs.query({
    windowId: windowId
  }, function (windowTabs) {
    // Windows like popups and other will also trigger
    // if there are no tabs just cancel
    if (windowTabs.length == 0) {
      return;
    }
    var currentQueue = getQueue(windowId).items;
    
    // Get number of opened tabs, whitelisted and pinned excluded
    var tabCount = 0;
    for (var i = 0; i < windowTabs.length; i++) {
      if (!isInWhitelist(windowTabs[i].url) && !windowTabs[i].pinned) {
        tabCount++;
      }
    }
    var freeSpace = tabLimit - tabCount;
    var filledSpace = 0;
    // Free space and items waiting
    if (freeSpace > 0 && currentQueue.length > 0) {
      if (!isQueuing) {
        // Create as many tabs as possible
        // First create the tabs, then remove the items from queue
        // after ALL new tabs have been created
        for (i = 0; filledSpace < freeSpace && i < currentQueue.length; i++) {
          if (!currentQueue[i].locked) {
            chrome.tabs.create({
              "windowId": windowId,
              "url": currentQueue[i].url,
              "active": false
            });
            filledSpace++;
          }
        }
        filledSpace = 0;
        for (i = 0; filledSpace < freeSpace && i < currentQueue.length; i++) {
          if (!currentQueue[i].locked) {
            removeItem(windowId, i);
            filledSpace++;
          }
        }
      }
    }
    // Reset for the next one
    isQueuing = false;
  });
}

/**
 * Open new window with associated queue
 */
function openQueueInWindow(queue) {
  chrome.windows.create({ 'focused': false }, function (windowInfo) {
    // Update queue and items with the new window id
    queue.window = windowInfo.id;
    var items = queue.items;
    for (var j = 0; j < items.length; j++) {
      items[j].window = windowInfo.id;
    }
    // Open items in queue to fill limit
    checkOpenNextItems(windowInfo.id);
  });
}

/**
 * Opens a new window per queue and updates their ids
 */
function restoreAllQueues() {
  if (queues.length === 0) {
    return;
  }
  // First cleanup all reference to window ids to prevent mixup
  for (var i = 0; i < queues.length; i++) {
    var q = queues[i];
    q.window = DEFAULT_ID;
    for (var j = 0; j < q.items.length; j++) {
      q.items[j].window = DEFAULT_ID;
    }
  }
  // Need to do it this way because the callback from windows.create
  // gets called after the for loop has finished and 'i' is wrong value 
  for (var i = 0; i < queues.length; i++) {
    openQueueInWindow(queues[i]);
  }
}

/**
 * Settings changes
 */
function onSettingsChanged(changes, namespace) {
  var key, storageChange, newValue;
  for (key in changes) {
    if (changes.hasOwnProperty(key)) {
      storageChange = changes[key];
      newValue = storageChange.newValue;
      if (key === 'tabLimit') {
        tabLimit = newValue;
      }
      else if (key === 'allowDuplicates') {
        allowDuplicates = newValue;
      }
    }
  }
}
/**
 * Push new url to queue and save it in local storage
 */
function saveItem(item) {
  var windowQueue = getQueue(item.window).items;
  if (!allowDuplicates) {
    // If duplicate, don't push and move it to top
    var p = findInQueue(windowQueue, item.url);
    if (p >= 0) {
      windowQueue.move(p, 0); // Move to top
      return;
    }
  }
  // Push to queue
  windowQueue.push(item);
  // Update local storage and badge
  cleanAndStore();
  updateBadgeCounter();
}

/**
 * Removes item from queue and storage
 */
function removeItem(queueId, index) {
  var itemQueue = getQueue(queueId).items;
  // Remove from queue
  itemQueue.splice(index, 1);
  cleanAndStore();
  updateBadgeCounter();
}

/**
 * Changes the lock state an item in the current/active queue
 */
function setLock(queueId, index, value) {
  var currentQueue = getQueue(queueId).items;
  if (currentQueue.length > 0) {
    currentQueue[index].locked = value;
    cleanAndStore();
  }
}

// Check if tab is on the wait list (new) and remove it
function findRemoveTabWaiting(tabId) {
  for (var i = 0; i < tabsWaitingArray.length; i++) {
    if (tabId === tabsWaitingArray[i].id) {
      tabsWaitingArray.splice(i, 1);
      return true;
    }
  }
  return false;
}
// Check if url is in queue. Returns index, -1 if not found
function findInQueue(queue, url) {
  var currentQueue = getQueue(queue).items;
  for (var i = 0; i < currentQueue.length; i++) {
    if (currentQueue[i] == url) {
      return i;
    }
  }
  return -1;
}
//Check if the url matches something in whitelist
function isInWhitelist(url) {
  for (var i = 0; i < whitelist.length; i++) {
    if (whitelist[i].test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Removes all items in queue
 */
function clearItems(queueId) {
  var currentQueue = getQueue(queueId);
  currentQueue.items = [];
  cleanAndStore();
  updateBadgeCounter();
}

// Simply save the new tab id and check later when url gets updated
// this fixes the problem with blank url when opening a link with target="_blank"
function onCreatedTab(newTab) {
  if (!isActive) {
    return;
  }
  tabsWaitingArray.push(newTab);
}
// New tab created, check limit and add to queue
function onUpdatedTab(tabId, tabInfo, tabState) {
  if (!isActive) {
    return;
  }
  //Pinned tab = removed tab
  if (tabInfo.pinned) {
    // Trigger opening next in queue
    checkOpenNextItems(tabState.windowId);
    //onRemovedTab(tabId, removeInfo);
    return;
  }
  //First check if the updated tab is one of the new ones
  //or if it's pinned
  if (!findRemoveTabWaiting(tabId)) {
    return;
  }
  // Get tabs in updated tab window
  chrome.tabs.query({
    windowId: tabState.windowId
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
      queueTab(tabState);
    }
  });
}

/**
 * Close tab and add it to queue
 */
function queueTab(tabState) {
  if (!isInWhitelist(tabState.url)) {
    // Create item
    var item = new Item(tabState.id, tabState.windowId, tabState.url, tabState.status, false);
    // Save to queue and local storage
    saveItem(item);
    isQueuing = true;
    chrome.tabs.remove(tabState.id);
  }
}

/**
 * Tab removed, check if there's something in the queue
 */
function onRemovedTab(tabId, removeInfo) {
  if (!isActive) {
    return;
  }
  checkOpenNextItems(removeInfo.windowId);
}

/**
 * Check related queue and reset its id
 */
function onWindowRemoved(id) {
  var queue = getQueue(id);
  if (queue.items.length > 0) {
    queue.window = DEFAULT_ID;
    for (var i = 0; i < queue.items.length; i++) {
      queue.items[i].window = DEFAULT_ID;
    }
  }
}

/**
 * Open all saved queues in new windows
 */
function restoreSavedQueues() {
  for (var i = 0; i < queues.length; i++) {
    if(queues[i].window === DEFAULT_ID) {
      openQueueInWindow(queues[i]);
    }
  }
}

// LISTENERS
// "OnLoad" listener to set the default options
document.addEventListener('DOMContentLoaded', init);
chrome.storage.onChanged.addListener(onSettingsChanged);
chrome.tabs.onCreated.addListener(onCreatedTab);
chrome.tabs.onRemoved.addListener(onRemovedTab);
chrome.tabs.onUpdated.addListener(onUpdatedTab);
chrome.tabs.onActivated.addListener(updateBadgeCounter);
chrome.windows.onRemoved.addListener(onWindowRemoved);