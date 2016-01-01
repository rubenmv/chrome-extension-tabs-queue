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
  isOverriding = false, // Next tab to open will override tab limit 
  storing = false, // To check if currently there"s a store operation waiting to finish
  updater = null, // Saves interval function
  checkingItems = false,
  // Tabs waiting for url update (before queuing)
  tabsWaiting = [],
  tabLimit = 10,
  lifo = false, // last-in-first-out. New items to top of the queue
  allowDuplicates = false,
  slowNetworkMode = false,
  slowNetworkLimit = 0, // Slow network mode (active if > 0)
  queueByRecent = false,
  queues = []; // Array of queued items

// Regular expressions for url exclusions
var ICON_DEFAULT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAAqElEQVR4nO3aQQrCQBBE0Y54/yOrW5GABI0fmfeWs2iKYtLMIjMAAMCKtpm5nzDz2afzT513+XDY31NAHaB23Tl7/ebe+fYO+anlb4AC6gC1vXeAHbASBdQBanvvgKOO7ozSNjO354Plb4AC6gA1BdQBagqoA9QUUAeoKaAOUFNAHaCmgDpATQF1gJoC6gA1BdQBagqoA9TO+Eforyx/AxRQBwAAACg8AEejCFAaFqVwAAAAAElFTkSuQmCC";
var ICON_DISABLED = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABcVBMVEUAAAD/AAD///8AAAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAD/AAAAAAABAAADAAAGAAAKAAAPAAAVAAAcAAAiAAAjAAApAAAtAAA3AABCAABHAABQAABZAABjAABpAAB4AAB6AACHAACQAACbAACkAACxAAC9AAC/AADCAADIAADPAADXAADbAADjAADqAADuAADxAAD1AAD5AAD8AAD+AAD/AAB4L4E0AAAAUXRSTlMAAAABAQMFBgcJCgsMDQ8VFhweICUnKi0uNDY3QkNGTlJUVVhgYmVnaXh5iIuMj52foKGio66wsba5vb7CyMnKzM7W2drb4+bq6/Dz9ff5/P5esCL3AAABx0lEQVR42u3XR1MCQRCGYXoFs6yKGRRzzjlnESOOOeecxTy/Xl3Lni1Bl25ult9xtt7n1oe1aVHuHwgDgMVKm2OjArwB2ZkUBeCZkVL262wgd1J+bMTFBDL88nPjOSwgzSe/1ssB9GHsx1IVIMIM3hfyltKHfXBdGLO9L2Igrhv7h01BBxbasH/aEnRg/hT75x0RAthMCw8cY/+yJxjAocQdCAaw/4r9kWAAuy/YnwhrIGTbz9ifzYd8tQa2HrE/XxB0YOMe+8slQQdWg9jfLItIgG8HNKoOSDdebGox1oBzAHufC+hAvDqgiWygA44O7KfdQAfsjdjP5gMDqMU+UAwMoAr7uUpgABVzCFQBAygKYF8HDMAzi32TnQG4p7HvcAAdyPZj350AdCDdh/2gE+iAPmY+IDrgHFIHlAZ0ILEHe38W0AHTAU25gQ7YW9UBeYAB1KsDKgQGUK0OqBwYQKU0HRADKFEHVAMMoEAdUIOdAZgOqN0BJMDY5gP2F4si4iGwFsT+elnQgZU77G9XBAO4wj64KmiAZixn/OuAMuH3/fS/4Box+sk8YAKaPmAckMYGtOQuGfBqDAAX11KmWQP//41/EngDrVcKealcgDwAAAAASUVORK5CYII=";

/*********************************************
 * CLASSES
 */

/**
 * Queue
 */
function Queue(windowId) {
  this.window = windowId,
  this.items = [];
  this.openingTab = false; // Currently opening a tab
}

/**
 * Item. Contains info about the tab saved in queue.
 */
function Item(id, windowId, url, state, locked) {
  this.id = id,
  this.window = windowId, // original window/queue where it was created
  this.url = url,
  this.state = state;
  this.locked = locked;
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

/*********************************************
 * QUEUE AND ITEM METHODS
 */

/**
 * Extend Array object to include move method
 */
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
 * Moves item position from specific queue
 */
function moveItemInQueue(queueId, oldPos, newPos) {
  var queue = getQueue(queueId).items;
  queue.move(oldPos, newPos);
  cleanAndStore();
}

/**
 * Returns the queue of a window. Creates one if it doesn"t exists.
 */
function getQueue(windowId) {
  for (var i = 0; i < queues.length; i++) {
    if (queues[i].window !== DEFAULT_ID && queues[i].window == windowId) {
      return queues[i];
    }
  }
  // Not found: creates new queue
  var newQueue = new Queue(windowId);
  queues.push(newQueue);
  return newQueue;
}

/**
 * Check if tab is on the wait list (new) and remove it
 */
function findTabWaiting(tabId, remove) {
  for (var i = 0; i < tabsWaiting.length; i++) {
    if (tabId === tabsWaiting[i].id) {
      if (remove) {
        tabsWaiting.splice(i, 1);
      }
      return true;
    }
  }
  return false;
}
/**
 * Check if url is in queue. Returns index, -1 if not found
 */
function findInQueue(qu, url) {
  //var currentQueue = getQueue(queue).items;
  for (var i = 0; i < qu.length; i++) {
    if (qu[i].url === url) {
      return i;
    }
  }
  return -1;
}
/**
 * Check if the url matches something in whitelist
 */
function isInWhitelist(url) {
  for (var i = 0; i < whitelist.length; i++) {
    if (whitelist[i].test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Delete queue
 */
function removeQueue(index) {
  queues.splice(index, 1);
  cleanAndStore();
}

/**
 * Removes all queues
 */
function clearQueues() {
  queues = [];
  cleanAndStore();
}

/**
 * Removes all items in queue
 */
function clearItems(queueId) {
  var currentQueue = getQueue(queueId);
  currentQueue.items = [];
  cleanAndStore();
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
    chrome.tabs.remove(tabState.id, function () {
      if (chrome.runtime.lastError !== undefined) {
        //console.error("An error ocurred removing tab: " + chrome.runtime.lastError.string);
        //console.error(chrome.runtime.lastError);
        return;
      }
    });
  }
}

/**
 * Compare function to sort tabs array
 */
function compareById(a, b) {
  if (a.id < b.id)
    return -1;
  if (a.id > b.id)
    return 1;
  return 0;
}

/**
 * Queue tabs on the right to fit limit
 */
function queueToLimit(windowId) {
  chrome.tabs.query({
    "windowId": windowId,
    "pinned": false
  }, function (tabs) {
    // Discard tabs from whitelist
    for (var i = 0; i < tabs.length; i++) {
      if (isInWhitelist(tabs[i].url)) {
        tabs.splice(i, 1);
        i--;
      }
    }
    if (tabs.length > tabLimit) {
      if (queueByRecent) {
        tabs = tabs.sort(compareById);
      }
      for (var i = tabLimit; i < tabs.length; i++) {
        queueTab(tabs[i]);
      }
    }
  });
}

/**
 * Push new url to queue and save it in local storage
 */
function saveItem(item) {
  var qu = getQueue(item.window).items;
  if (!allowDuplicates) {
    // If duplicate, don"t push and move it to top
    var p = findInQueue(qu, item.url);
    if (p >= 0) {
      qu.move(p, 0); // Move to top
      return;
    }
  }
  // Push to queue
  if (lifo) {
    qu.unshift(item);
  }
  else {
    qu.push(item);
  }
  // Update local storage and badge
  cleanAndStore();
}

/**
 * Removes item from queue and storage
 */
function removeItem(queueId, index) {
  var itemQueue = getQueue(queueId).items;
  // Remove from queue
  itemQueue.splice(index, 1);
  cleanAndStore();
}

/***********************************************************
 * GENERAL
 */

/**
 * Change active state and browser action icon
 */
function setActive(active) {
  isActive = active;
  // Save to storage
  chrome.storage.local.set({ "isActive": isActive });
  // Change icon
  var icon = isActive ? ICON_DEFAULT : ICON_DISABLED;
  
  // Active/deactive update interval
  if (isActive) {
    setUpdater();
  }
  else {
    window.clearInterval(updater);
  }
  chrome.browserAction.setIcon({
    path: icon
  });
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
    var badgeColor = "#00ff00";
    var currentQueue = getQueue(currentTab.windowId).items;
    if (currentQueue.length > 0) {
      badgeColor = "#ff0000";
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
  document.removeEventListener("DOMContentLoaded");
  //sync.get callback, data received
  function optionsDataRetrieved(data) {
    // Check for error
    if (chrome.runtime.lastError !== undefined) {
      console.error("An error ocurred initializing options: " + chrome.runtime.lastError.string);
      return;
    }
    // Initialize properties
    if (data.hasOwnProperty("tabLimit")) {
      tabLimit = data.tabLimit;
    }
    if (data.hasOwnProperty("lifo")) {
      lifo = data.lifo;
    }
    if (data.hasOwnProperty("allowDuplicates")) {
      allowDuplicates = data.allowDuplicates;
    }
    if (data.hasOwnProperty("queueByRecent")) {
      queueByRecent = data.queueByRecent;
    }
    if (data.hasOwnProperty("slowNetworkMode")) {
      slowNetworkMode = data.slowNetworkMode;
    }
    if (data.hasOwnProperty("slowNetworkLimit")) {
      slowNetworkLimit = data.slowNetworkLimit;
    }
    if (data.hasOwnProperty("isActive")) {
      isActive = data.isActive;
    }
    var iconPath = isActive ? ICON_DEFAULT : ICON_DISABLED;
    chrome.browserAction.setIcon({
      "path": iconPath
    });
    if (data.hasOwnProperty("queues")) {
      queues = JSON.parse(data.queues);
    }
    initQueues();
    setUpdater();
    // Restore queues on start?
    if (data.hasOwnProperty("restoreOnStart") && data.restoreOnStart) {
      restoreSavedQueues();
    }
    // Context menu
    if (data.hasOwnProperty("hideContextMenu") && !data.hideContextMenu) {
      createContextMenu();
    }
  }
  // Get the options from sync storage
  chrome.storage.local.get(null, optionsDataRetrieved);
}

/**
 * Resets queues ids
 */
function initQueues() {
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
}

/**
 * Check tabs every x seconds and update badge counter
 */
function setUpdater() {
  updater = window.setInterval(function () {
    if (!isActive) {
      return;
    }
    // Get all windows info
    chrome.windows.getAll({ "populate": true }, function (windows) {
      for (var i = 0; i < windows.length; i++) {
        if (windows[i].type === "normal" && !checkingItems) {
          checkingItems = true;
          checkOpenNextItems(windows[i]);
          checkingItems = false;
        }
      }
    });
    updateBadgeCounter();
  }, 500);
}


/**
 * Calculate free space based on active limits given a set of tabs
 * Return number of free spaces
 */
function calculateFreespace(tabs) {
  var tabCount = 0, loadingTabCount = 0;
  for (var i = 0; i < tabs.length; i++) {
    if (!isInWhitelist(tabs[i].url) && !tabs[i].pinned) {
      tabCount++;
      if (tabs[i].status === "loading") {
        loadingTabCount++;
      }
    }
  }
  var freeSpace = tabLimit - tabCount;
  if (freeSpace > 0) {
    if (slowNetworkMode) { // Slow network mode active
      var loadingSpace = slowNetworkLimit - loadingTabCount;
      if (loadingSpace < freeSpace) {
        freeSpace = loadingSpace;
      }
    }
  }
  return freeSpace;
}

/**
 * Try to open next item in queue
 * Works in conjunction with a timeout to trigger a new check
 */
function checkOpenNextItems(wdw) {
  // Check how many tabs can we create
  // Windows like popups and other will also trigger
  // if there are no tabs just cancel
  if (wdw.tabs.length == 0) {
    return;
  }
  var currentQueue = getQueue(wdw.id).items;
  var freeSpace = calculateFreespace(wdw.tabs);
  // Free space and items waiting
  if (freeSpace > 0 && currentQueue.length > 0) {
    // Create as many tabs as possible
    // First create the tabs, then remove the items from queue
    // after ALL new tabs have been created
    var j = 0;
    while (freeSpace > 0 && j < currentQueue.length) {
      if (!currentQueue[j].locked) {
        chrome.tabs.create({
          "windowId": wdw.id,
          "url": currentQueue[j].url,
          "active": false
        });
        removeItem(wdw.id, j);
        freeSpace--;
      }
      else {
        j++;
      }
    }
  }
}

/**
 * Opens a new tab with an url.
 * override = the tab goes into the override limit list
 * replaceCurrent = instead of new tab, replace/load in current
 */
function openUrlInTab(windowId, url, position, override, replaceCurrent) {
  isOverriding = override;
  // If loads in current, no need to override limit
  if (replaceCurrent) {
    chrome.tabs.update({
      "url": url
    });
  }
  // Create new tab
  else {
    if (position > -1) {
      chrome.tabs.create({ "windowId": windowId, "url": url, "index": position, "active": false });
    }
    else {
      chrome.tabs.create({ "windowId": windowId, "url": url, "active": false });
    }
  }
}

/**
 * Open new window with associated queue
 */
function openQueueInWindow(queue) {
  chrome.windows.create({ "focused": false }, function (windowInfo) {
    // Update queue and items with the new window id
    queue.window = windowInfo.id;
    var items = queue.items;
    for (var j = 0; j < items.length; j++) {
      items[j].window = windowInfo.id;
    }
  });
}

/**
 * Restore a queue given a position in the list
 */
function restoreQueue(position) {
  if (queues.length <= position) {
    return;
  }
  openQueueInWindow(queues[position]);
}

/**
 * Open all saved queues into new windows
 */
function restoreSavedQueues() {
  for (var i = 0; i < queues.length; i++) {
    if (queues[i].window === DEFAULT_ID) {
      openQueueInWindow(queues[i]);
    }
  }
}

/**********************************************
 * STORAGE
 */
/**
 * Settings changes
 */
function onSettingsChanged(changes, namespace) {
  var key, storageChange, newValue;
  for (key in changes) {
    if (changes.hasOwnProperty(key)) {
      storageChange = changes[key];
      newValue = storageChange.newValue;
      if (key === "tabLimit") {
        tabLimit = newValue;
      }
      else if (key === "lifo") {
        lifo = newValue;
      }
      else if (key === "allowDuplicates") {
        allowDuplicates = newValue;
      }
      else if (key === "queueByRecent") {
        queueByRecent = newValue;
      }
      else if (key === "hideContextMenu") {
        if (newValue) {
          chrome.contextMenus.removeAll();
        }
        else {
          createContextMenu();
        }
      }
      else if (key === "slowNetworkMode") {
        slowNetworkMode = newValue;
      }
      else if (key === "slowNetworkLimit") {
        slowNetworkLimit = newValue;
      }
    }
  }
}
/**
 * Remove empty queues and save in local storage
 */
function cleanAndStore() {
  if (!storing) {
    storing = true;
    var timer = window.setTimeout(function () {
      // cleanup
      var i = 0;
      while (i < queues.length) {
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
      chrome.storage.local.set({ "queues": jsonQueues }, function () {
        if (chrome.runtime.lastError !== undefined) {
          console.error("An error ocurred saving queues: " + chrome.runtime.lastError.string);
          console.error(chrome.runtime.lastError);
        }
      });
      window.clearTimeout(timer);
      storing = false;
    }, 2000);
  }
}

/********************************************
 * CONTEXT MENU
 */
function createContextMenu() {
  chrome.contextMenus.create({
    "title": "Open link in new tab (don't queue)",
    "contexts": ["link"],
    "onclick": onContextMenuLinkClicked
  });
}

/********************************************
 * EVENTS
 */

/**
 * Simply save the new tab id and check later when url gets updated
 * this fixes the problem with blank url when opening a link with target="_blank"
 */
function onCreatedTab(newTab) {
  if (!isActive) {
    return;
  }
  // If the tab is overriding the limit, don"t
  // push it into the waiting list
  if (!isOverriding) {
    tabsWaiting.push(newTab);
  }
  isOverriding = false; // Reset override for the next one
}
/**
 * New tab created, check limit and add to queue
 */
function onUpdatedTab(tabId, tabInfo, tabState) {
  //First check if the updated tab is one of the new ones
  if (!isActive || tabInfo.pinned || !findTabWaiting(tabId, true)) {
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
 * Context Menu action, open new tab next to current
 */
function onContextMenuLinkClicked(info, tab) {
  openUrlInTab(tab.windowId, info.linkUrl, tab.index + 1, true, false);
}

/**
 * On installed or updated, import queue from old versions (<= 1.0)
 */
function onInstalled() {
  console.log("on installed...");
  function queueDataRetrieved(items) {
    // Fill queue
    if (items.hasOwnProperty('queueLength')) {
      // Get/create a new queue
      var q = getQueue(DEFAULT_ID);
      
      console.log("old queue length: " + items.queueLength);
      for (var i = 0; i < items.queueLength; i++) {
        console.log(['item' + i]);
        // Create item
        var item = new Item(DEFAULT_ID, DEFAULT_ID, items['item' + i], "complete", false);
        // push to queue
        q.items.push(item);
      }
    }
    // CLEANUP OLD ITEMS IN STORAGE

    cleanAndStore();
  }

  chrome.storage.local.get(null, queueDataRetrieved);
}

/********************************************
 * Register listeners
 */
document.addEventListener("DOMContentLoaded", init);
chrome.storage.onChanged.addListener(onSettingsChanged);
chrome.tabs.onCreated.addListener(onCreatedTab);
chrome.tabs.onUpdated.addListener(onUpdatedTab);
chrome.windows.onRemoved.addListener(onWindowRemoved);
chrome.runtime.onInstalled.addListener(onInstalled);
