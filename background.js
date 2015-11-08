var isActive = true; // Extension is active?
//var urlQueue = [];
var tabsWaitingArray = []; // Tabs waiting for url update (before queuing)
var tabLimit = 10;
var allowDuplicates = false;
var queues = []; // Array of Queue objects
// Indicates the number of simultaneous tabs that need to be opened
// so they will be opened one after another, not simultaneously
var openingTabs = 0;
// Interval when opening several tabs at the "same" time, this way they won't mess up with the queue
var interval = 0; //ms

// When a new tab is queued, it's instantly removed
// this flag alerts not to open a new tab when this happens
var isQueuing = false;

// Regular expressions for url exclusions
var whitelist = [/^chrome[:|-].*/];
var ICON_MAX_KEYS = 14;
var ICON_DEFAULT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAAqElEQVR4nO3aQQrCQBBE0Y54/yOrW5GABI0fmfeWs2iKYtLMIjMAAMCKtpm5nzDz2afzT513+XDY31NAHaB23Tl7/ebe+fYO+anlb4AC6gC1vXeAHbASBdQBanvvgKOO7ozSNjO354Plb4AC6gA1BdQBagqoA9QUUAeoKaAOUFNAHaCmgDpATQF1gJoC6gA1BdQBagqoA9TO+Eforyx/AxRQBwAAACg8AEejCFAaFqVwAAAAAElFTkSuQmCC';


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
function Item(id, windowId, url, state) {
  this.id = id,
  this.window = windowId,
  this.url = url,
  this.state = state;
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
 * Moves item position from specific queue
 */
function moveItemInQueue(queueId, oldPos, newPos) {
  var queue = getQueue(queueId).items;
  queue.move(oldPos, newPos);
}

function setActive(active) {
  isActive = active;
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
      color: badgeColor,
    });
    chrome.browserAction.setBadgeText({
      text: currentQueue.length.toString(),
      tabId: currentTab.id
    });
  });
}

function initOptions() {
  document.removeEventListener('DOMContentLoaded');
  //sync.get callback, data received
  function optionsDataRetrieved(options) {
    // Check for error
    if (chrome.runtime.lastError !== undefined) {
      console.log('An error ocurred initializing options: ' + chrome.runtime.lastError.string);
      return;
    }
    // Initialize properties
    if (options.hasOwnProperty('tabLimit')) {
      tabLimit = options.tabLimit;
    }
    if (options.hasOwnProperty('allowDuplicates')) {
      allowDuplicates = options.allowDuplicates;
    }
    //Get icon parts and join them
    var iconString = '';
    if (options.hasOwnProperty('icon1')) {
      // Retrieve icon data
      for (var i = 0; i < ICON_MAX_KEYS; i++) {
        if (options.hasOwnProperty('icon' + i)) {
          iconString += options['icon' + i];
        } else {
          break; // No key found, icon is complete
        }
      }
    } else {
      // Default icon
      iconString = ICON_DEFAULT;
    }
    chrome.browserAction.setIcon({
      path: iconString
    });
  }
  // local.get callback, queue state
  /*function queueDataRetrieved(items) {
    // Fill queue
    if (items.hasOwnProperty('queueLength')) {
      for (var i = 0; i < items.queueLength; i++) {
        urlQueue.push(items['item' + i]);
      }
    }
    // Badge counter
    updateBadgeCounter();
  }*/
  // Get the options from sync storage
  chrome.storage.sync.get(null, optionsDataRetrieved);
  // Get queue state from local storage
  //chrome.storage.local.get(null, queueDataRetrieved);
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
      }
      else if (key === 'allowDuplicates') {
        allowDuplicates = newValue;
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
function saveItem(item) {
  chrome.windows.getLastFocused(function (windowInfo) {
    var currentQueue = getQueue(windowInfo.id).items;
    if (!allowDuplicates) {
      // If duplicate, don't push and move it to top
      var p = findInQueue(item.url);
      if (p >= 0) {
        currentQueue.move(p, 0); // Move to top
        return;
      }
    }
    // Push to queue
    console.log("new item into queue");
    currentQueue.push(item);
    //console.log(item);
    //console.log(currentQueue);
    console.log(queues);
    // Add to storage
    var itemIndex = currentQueue.length - 1,
      values = {};
    // Set new length
    values.queueLength = currentQueue.length;
    // Add new item
    values['item' + itemIndex] = item.url;
    chrome.storage.local.set(values, function () {
      // Check for error
      if (chrome.runtime.lastError !== undefined) {
        console.error('An error ocurred saving item: ' + chrome.runtime.lastError.string);
        console.error(chrome.runtime.lastError);
      }
    });
    updateBadgeCounter();
  });
}
/**
 * Removes item from queue and storage
 * @param  {int} index [Item's index in queue]
 */
function removeItem(index) {
  chrome.windows.getLastFocused(function (windowInfo) {
    var currentQueue = getQueue(windowInfo.id).items; 
    // Not the last index, rearange queue
    var lastIndex = currentQueue.length - 1;
    var newValues = {};
    newValues.queueLength = lastIndex;
    if (index < lastIndex) {
      for (var i = index; i < lastIndex; i++) {
        newValues['item' + i] = currentQueue[i + 1]; //current item = next item
      }
    }
    chrome.storage.local.set(newValues, function () {
      // Remove last item, now is duplicated
      var lastItem = 'item' + lastIndex;
      chrome.storage.local.remove(lastItem);
    });
    // Remove from queue
    currentQueue.splice(index, 1);
    updateBadgeCounter();
  });
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
// Check if url is in queue. Returns index, -1 if not found
function findInQueue(url) {
  chrome.windows.getLastFocused(function (windowInfo) {
    var currentQueue = getQueue(windowInfo.id).items;
    for (var i = 0; i < currentQueue.length; i++) {
      if (currentQueue[i] == url) {
        return i;
      }
    }
    return -1;
  });
}
// Check if the url matches something in whitelist
function isInWhitelist(url) {
  for (var i = 0; i < whitelist.length; i++) {
    if (whitelist[i].test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Opens all items in queue
 */
function openAllItems() {
  // No implementation yet
}

/**
 * Queue all tabs except active
 */
/*function queueAllTabs() {
  // Get tabs in current window
  chrome.tabs.query({
    windowId: chrome.windows.WINDOW_ID_CURRENT
  }, function (windowTabs) {
    // Get and queue opened tabs. Current, whitelisted and pinned excluded
    for (var i = 0; i < windowTabs.length; i++) {
      if (!windowTabs[i].highlighted && !isInWhitelist(windowTabs[i].url) && !windowTabs[i].pinned) {
        queueTab(windowTabs[i].id, windowTabs[i]);
      }
    }
  });
}*/

/**
 * Removes all items in queue
 */
function clearItems() {
  console.log("Clearing items");
  chrome.windows.getLastFocused(function (windowInfo) {
    console.log("Last focused window info:");
    console.log(windowInfo);
    var currentQueue = getQueue(windowInfo.id);
    console.log(currentQueue);
    currentQueue.items = [];
    chrome.storage.local.clear();
    updateBadgeCounter();
  });
}

// Simply save the new tab id and check later when url gets updated
// this fixes the problem with blank url when opening a link with target="_blank"
function onCreatedTab(newTab) {
  //console.log("onCreatedTab, isActive? " + isActive);
  if (!isActive) {
    return;
  }

  tabsWaitingArray.push(newTab.id);
}
// New tab created, check limit and add to queue
function onUpdatedTab(tabId, tabInfo, tabState) {
  //console.log("onUpdateTab, isActive? " + isActive);
  if (!isActive) {
    return;
  }
  //Pinned tab = removed tab
  if (tabInfo.pinned) {
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
    var item = new Item(tabState.id, tabState.windowId, tabState.url, tabState.status);
    // Save to queue and local storage
    saveItem(item);
    isQueuing = true;
    chrome.tabs.remove(tabState.id);
  }
}

// Tab removed, check if there's something in the queue
function onRemovedTab() {
  //console.log("onRemovedTab, isActive? " + isActive);
  if (!isActive) {
    return;
  }
  openingTabs++;
  setTimeout(function () {
    // Check how many tabs can we create
    chrome.tabs.query({
      windowId: chrome.windows.WINDOW_ID_CURRENT
    }, function (windowTabs) {
      // Windows like popups and other will also trigger
      // if there are no tabs just cancel
      if (windowTabs.length == 0) {
        return;
      }
      //console.log("open tab " + (openingTabs * interval));
      var windowId = windowTabs[0].windowId;
      var currentQueue = getQueue(windowId).items;
      // Get number of opened tabs, whitelisted and pinned excluded
      var tabCount = 0;
      for (var i = 0; i < windowTabs.length; i++) {
        if (!isInWhitelist(windowTabs[i].url) && !windowTabs[i].pinned) {
          tabCount++;
        }
      }
      var freeSpace = tabLimit - tabCount;
      // Free space and items waiting
      if (freeSpace > 0 && currentQueue.length > 0) {
        if (!isQueuing) {
          // Create as many tabs as possible
          // First create the tabs, then remove the items from queue
          // after ALL new tabs have been created
          for (i = 0; i < freeSpace && i < currentQueue.length; i++) {
            chrome.tabs.create({
              url: currentQueue[i].url,
              active: false
            });
          }
          for (i = 0; i < freeSpace && i < currentQueue.length; i++) {
            removeItem(i);
          }
        }
      }
      // Reset for the next one
      isQueuing = false;
      openingTabs--;
    });
  }, (openingTabs * interval));
}
// LISTENERS
// "OnLoad" listener to set the default options
document.addEventListener('DOMContentLoaded', initOptions);
chrome.storage.onChanged.addListener(onSettingsChanged);
chrome.tabs.onCreated.addListener(onCreatedTab);
chrome.tabs.onRemoved.addListener(onRemovedTab);
chrome.tabs.onUpdated.addListener(onUpdatedTab);
chrome.tabs.onActivated.addListener(updateBadgeCounter);