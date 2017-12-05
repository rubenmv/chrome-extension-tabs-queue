/*global chrome, FileReader, window, document, console, Sortable*/
"use strict";

var
  bgPage = chrome.extension.getBackgroundPage(),
  queueId = null;

/*****************************************
 * QUEUE OPERATIONS
 */  
  
/**
* Updates/removes index/value attribute on list items and update queue
*/
function reIndex(element, oldPos, newPos) {
  var list = document.getElementById("url-list");
  // Just remove item
  if (newPos === -1) {
    bgPage.removeItem(queueId, element.value); // window/queue, tab index
    list.removeChild(element);
  }
  else { // Move in queue
    bgPage.moveItemInQueue(queueId, oldPos, newPos);
  }
  // Reindex list
  var items = list.getElementsByClassName("list-item");
  for (var i = 0; i < items.length; i++) {
    items[i].value = i;
  }
}

/**
 * Clear all queues
*/
function onClearQueues() {
  bgPage.clearSavedQueues();
  window.close();
}

/**
 * Clear all items in current queue
*/
function onClearItems() {
  bgPage.clearItems(queueId);
  window.close();
}

/**
 * Toggle active state
 */
function onSwitchChanged(e) {
  bgPage.setActive(e.target.checked);
}

/**
 * Restore all saved windows
 */
function onRestore() {
  bgPage.restoreSavedQueues();
  window.close();
}

/**
 * Opens clicked item on current tab or delete item
 */
function onQueueListClick(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  var liElement = evt.target.parentNode;
  if (evt.target.classList.contains("item-url")) {
    // ctrl, command (OSX), middle mouse
    var newTab = false;
    if (evt.ctrlKey || evt.metaKey || evt.button == 1) {
      newTab = true;
    }
    // openUrlInTab(windowId, url, position, override, replaceCurrent)
    console.log(evt.target.getAttribute("data-url"));
    bgPage.openUrlInTab(queueId, evt.target.getAttribute("data-url"), -1, newTab, !newTab);
  
    // Remove element from queue and storage, only if not locked
    // value (int) was added on getBackgroundInfo() when creating li elements
    
    var list = document.getElementById("url-list");

    var itemLock = liElement.getElementsByClassName("item-lock")[0];
    if (itemLock && itemLock.getAttribute("data-checked") === "false") {
      reIndex(liElement, liElement.value, -1); // Reindex list (-1 to remove item)
    }
  }
  else if (evt.target.classList.contains("list-item-btn")) {
    if (evt.target.getAttribute("data-type") === "list-item-remove") {
      reIndex(liElement, liElement.value, -1);
    }
  }
}

/**
 * Manages clicks on saved queues list
 */
function onSavedListClick(evt) {
  evt.stopPropagation();
  // Button clicked
  var parent = evt.target.parentNode,
    value = parent.value;
  if (evt.target.classList.contains("list-item-btn")) {
    if (evt.target.getAttribute("data-type") === "list-item-restore") {
      bgPage.restoreQueue(value);
    }
    else if (evt.target.getAttribute("data-type") === "list-item-merge") {
      bgPage.mergeQueue(value, queueId);
    }
    else if (evt.target.getAttribute("data-type") === "list-item-remove") {
      bgPage.removeQueue(value);

    }
    window.close();
  }
  else if (evt.target.getAttribute("data-type") === "list-item-title") {
    var ol = parent.getElementsByTagName("ol");
    if (ol.length > 0) {
      ol[0].style.display = (ol[0].style.display === "none") ? "block" : "none";
    }
  }
}

/****************************************************
 * HTML AND PRESENTATION
 */
/**
 * Show/hide remove button on queue item
 */
function toggleListItemButton(evt) {
  var btns = evt.target.getElementsByClassName("list-item-btn");
  for (var i = 0; i < btns.length; i++) {
    btns[i].style.display = (btns[i].style.display === "none" ? "inline" : "none");
  }
}

/**
 * Ask for confirmation and calls clear all
 */
function toggleClearConfirm(evt) {
  // Get confirm dialog associated
  var dialog = document.querySelectorAll('[data-for="' + evt.target.getAttribute("id") + '"]')[0];
  if (!dialog) {
    return;
  }
  //evt.target.style.display = evt.target.style.display !== "none" ? "none" : "inline-block";
  evt.target.style.visibility = evt.target.style.visibility !== "hidden" ? "hidden" : "visible";
  dialog.style.display = dialog.style.display !== "none" ? "none" : "inline-block";
}

/**
 * Process clear confirm dialog click
 */
function onConfirmDialogClick(evt) {
  // Get associated control/button
  // currentTarget (the one with eventListener) == parentNode in this case
  var button = document.getElementById(evt.currentTarget.getAttribute("data-for"));
  var event = { "target": button }; // fake event
  // If no, just toggle dialog
  if (evt.target.getAttribute("name") === "clearNo") {
    toggleClearConfirm(event);
  }
  else if (evt.target.getAttribute("name") === "clearYes") {
    // Run the corresponding action
    if (button.id === "buttonClearItems") {
      onClearItems();
    }
    else if (button.id === "buttonClearQueues") {
      onClearQueues();
    }
  }
}

/**
 * Enable/disable item lock 
 */
function toggleLock(evt) {
  var liElement = evt.target.parentNode;
  var state = false;
  if (evt.target.getAttribute("data-checked") === "false") { // toggle
    state = true;
  }
  evt.target.setAttribute("data-checked", state.toString());
  var image = state ? "images/lock-enabled.png" : "images/lock-disabled.png";
  evt.target.setAttribute("src", image);
  bgPage.setLock(queueId, liElement.value, state);
}

/**
 * Creates new queue item
 */
function createItem(index, url, title, locked) {
  // List element
  var li = document.createElement("li");
  li.setAttribute("class", "list-item");
  // Handle and link
  var handle = document.createElement("span");
  handle.setAttribute("class", "handle");
  handle.textContent = "☰  ";
  // Lock icon
  var lock = document.createElement("img");
  lock.setAttribute("class", "item-lock");
  lock.setAttribute("data-checked", locked.toString());
  locked ? lock.setAttribute("src", "images/lock-enabled.png") : lock.setAttribute("src", "images/lock-disabled.png");
  lock.addEventListener("click", toggleLock);
  // Url
  var urlSpan = document.createElement("span");
  urlSpan.setAttribute("class", "item-url list-item-title");
  //urlSpan.setAttribute("href", url);
  urlSpan.setAttribute("data-url", url);
  urlSpan.textContent = url;
  if(title !== undefined && title.trim() !== "") {
    urlSpan.textContent = itemList[j].title;
  }
  
  // Remove button
  var remove = document.createElement("span");
  remove.setAttribute("class", "list-item-btn");
  remove.setAttribute("data-type", "list-item-remove");
  remove.textContent = "x";
  remove.style.display = "none";
  // Append in order
  li.appendChild(handle);
  li.appendChild(lock);
  li.appendChild(lock);
  li.appendChild(urlSpan);
  li.appendChild(remove);
  li.value = index; // To be able to remove it from the background page queue
  // Add listeners to show/hide the remove item button
  li.addEventListener("mouseenter", toggleListItemButton);
  li.addEventListener("mouseleave", toggleListItemButton);

  return li;
}

/**
 * Displays a list of saved queues
 */
function loadSavedQueues() {
  var
    qus = bgPage.queues,
    list = document.getElementById("savedQueuesList"),
    queuesInfo = document.getElementById("savedQueuesInfo"),
    savedCount = 0,
    liQueue = null;

  for (var i = 0; i < qus.length; i++) {
    if (qus[i].window === bgPage.DEFAULT_ID) {
      savedCount++;
      // LI element
      liQueue = document.createElement("li");
      liQueue.setAttribute("value", i);
      // Title
      var title = document.createElement("span");
      //title.textContent = "Queue " + savedCount + " :: " + qus[i].items.length + " items";
      title.textContent = qus[i].name + " :: " + qus[i].items.length + " items";
      title.setAttribute("class", "list-item-title");
      title.setAttribute("data-type", "list-item-title");
      var restore = document.createElement("span");
      restore.setAttribute("class", "list-item-btn");
      restore.setAttribute("alt", "Restore queue in a new window");
      restore.setAttribute("data-type", "list-item-restore");
      restore.textContent = "o";
      restore.style.display = "none";
      var merge = document.createElement("span");
      merge.setAttribute("class", "list-item-btn");
      merge.setAttribute("alt", "Merge with current list");
      merge.setAttribute("data-type", "list-item-merge");
      merge.textContent = "v";
      merge.style.display = "none";
      var remove = document.createElement("span");
      remove.setAttribute("class", "list-item-btn");
      remove.setAttribute("alt", "Delete queue");
      remove.setAttribute("data-type", "list-item-remove");
      remove.textContent = "x";
      remove.style.display = "none";
      // Append content
      liQueue.appendChild(title);
      liQueue.appendChild(restore);
      liQueue.appendChild(merge);
      liQueue.appendChild(remove);
      // Listeners
      liQueue.addEventListener("mouseenter", toggleListItemButton);
      liQueue.addEventListener("mouseleave", toggleListItemButton);

      list.appendChild(liQueue);

      var olItems = document.createElement("ol");
      olItems.setAttribute("class", "sublist");
      olItems.style.display = "none";
      // Load list items (read-only)
      var itemList = qus[i].items;
      for (var j = 0; j < itemList.length; j++) {
        var liItem = document.createElement("li");
        liItem.setAttribute("data-url", itemList[j].url);
        //liItem.textContent = itemList[j].url;
        if(itemList[j].title !== undefined && itemList[j].title.trim() !== "") {
          liItem.textContent = itemList[j].title;
        }
        olItems.appendChild(liItem);
      }
      liQueue.appendChild(olItems);
    }
  }
  // Listen to clicks on list
  list.addEventListener("click", onSavedListClick);
  if (savedCount === 0) {
    queuesInfo.textContent = "No saved queues";
  }
}

/**
 * Call queue to limit and close popup
 */
function onQueueToLimit() {
  bgPage.queueToLimit(queueId);
  window.close();
}

/**
 * Gets data from background page
 */
function getBackgroundInfo() {
  chrome.windows.getLastFocused(function (windowInfo) {
    queueId = windowInfo.id;
    var itemsInfo = document.getElementById("urlListInfo"),
      urlList = document.getElementById("url-list"),
      urlArray = bgPage.getQueue(queueId).items;
    if (urlArray.length > 0) {
      //var list = document.getElementById("my-ui-list");
      //Sortable.create(urlList); // That"s all.
      Sortable.create(urlList, {
        animation: 100, // ms, animation speed moving items when sorting, `0` — without animation
        handle: ".handle", // Restricts sort start click/touch to the specified element
        onEnd: function (evt) {
          reIndex(null, evt.oldIndex, evt.newIndex);
        }
      });
      itemsInfo.textContent = "Queue in this window";
      for (var i = 0; i < urlArray.length; i++) { 
        // Append item to list
        urlList.appendChild(createItem(i, urlArray[i].url, urlArray[i].title, urlArray[i].locked));
      }
      urlList.addEventListener("click", onQueueListClick);
    }
    else {
      itemsInfo.textContent = "Queue is empty";
    }
  });

  loadSavedQueues();
  document.getElementById("buttonRestoreAll").addEventListener("click", onRestore);

  // After init add the other listeners
  var switchButton = document.getElementById("myonoffswitch");
  switchButton.checked = bgPage.isActive;
  document.getElementById("buttonClearQueues").addEventListener("click", toggleClearConfirm);
  document.getElementById("buttonClearItems").addEventListener("click", toggleClearConfirm);
  document.getElementById("queueToLimit").addEventListener("click", onQueueToLimit);
  // Listeners for confirm dialogs and hide them
  var dlgs = document.getElementsByClassName("dialog-clear");
  for (var i = 0; i < dlgs.length; i++) {
    dlgs[i].addEventListener("click", onConfirmDialogClick);
    dlgs[i].style.display = "none";
  }
  switchButton.addEventListener("change", onSwitchChanged);
}

document.addEventListener("DOMContentLoaded", getBackgroundInfo);
