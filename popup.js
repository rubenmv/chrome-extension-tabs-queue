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
 * Opens clicked item on current tab
 */
function openItemInCurrentTab(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  if (evt.target.className !== "item-url") {
    return;
  }
  
  // ctrl, command (OSX), middle mouse
  var newTab = false;
  if (evt.ctrlKey || evt.metaKey || evt.button == 1) {
    newTab = true;
  }
  // Open url, override limit, replace current tab
  bgPage.openUrlInTab(queueId, evt.target.textContent, newTab, !newTab);
  
  // Remove element from queue and storage, only if not locked
  // value (int) was added on getBackgroundInfo() when creating li elements
  var liElement = evt.target.parentNode;
  var itemLock = liElement.getElementsByClassName("item-lock")[0];
  if (itemLock && itemLock.getAttribute("data-checked") === "false") {
    //liElement.parentNode.removeChild(liElement); // Remove li element
    reIndex(liElement, liElement.value, -1); // Reindex list (-1 to remove item)
  }
}

/**
 * Remove item
 */
function deleteItem(evt) {
  var liElement = evt.target.parentNode;
  reIndex(liElement, liElement.value, -1);
}


/**
 * Clear all queues
*/
function onClearQueues() {
  bgPage.clearQueues();
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
 * Manages clicks on saved queues list
 */
function onSavedListClick(evt) {
  evt.stopPropagation();
  if (evt.target.className !== "btn") {
    return;
  }
  bgPage.restoreQueue(evt.target.getAttribute("data-queue"));
  window.close();
}

/****************************************************
 * HTML AND PRESENTATION
 */

/**
 * Show/hide remove button on queue item
 */
function toggleRemoveButton(evt) {
  var remove = evt.target.getElementsByClassName("item-remove")[0];
  remove.style.display = remove.style.display === "none" ? "inline" : "none";
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
function createItem(index, url, locked) {
  // List element
  var liElement = document.createElement("li");
  liElement.setAttribute("class", "list-item");
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
  urlSpan.setAttribute("class", "item-url");
  //urlSpan.setAttribute("href", url);
  urlSpan.textContent = url;
  // Remove button
  var remove = document.createElement("span");
  remove.setAttribute("class", "item-remove");
  remove.textContent = "x  ";
  remove.style.display = "none";
  remove.addEventListener("click", deleteItem);
  // Append in order
  liElement.appendChild(handle);
  liElement.appendChild(lock);
  liElement.appendChild(lock);
  liElement.appendChild(urlSpan);
  liElement.appendChild(remove);
  liElement.value = index; // To be able to remove it from the background page queue
  // Add listeners to show/hide the remove item button
  liElement.addEventListener("mouseenter", toggleRemoveButton);
  liElement.addEventListener("mouseleave", toggleRemoveButton);

  return liElement;
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
        animation: 150, // ms, animation speed moving items when sorting, `0` — without animation
        handle: ".handle", // Restricts sort start click/touch to the specified element
        onEnd: function (evt) {
          reIndex(null, evt.oldIndex, evt.newIndex);
        }
      });
      itemsInfo.textContent = "Queue in this window";
      for (var i = 0; i < urlArray.length; i++) { 
        // Append item to list
        urlList.appendChild(createItem(i, urlArray[i].url, urlArray[i].locked));
      }
      urlList.addEventListener("click", openItemInCurrentTab);
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
  // Listeners for confirm dialogs and hide them
  var dlgs = document.getElementsByClassName("dialog-clear");
  for (var i = 0; i < dlgs.length; i++) {
    dlgs[i].addEventListener("click", onConfirmDialogClick);
    dlgs[i].style.display = "none";
  }
  switchButton.addEventListener("change", onSwitchChanged);
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
    li = null;
  for (var i = 0; i < qus.length; i++) {
    if (qus[i].window === bgPage.DEFAULT_ID) {
      savedCount++;
      // LI element
      li = document.createElement("li");
      // Title
      var title = document.createElement("h3");
      title.textContent = "Queue " + savedCount + " --- " + qus[i].items.length + " items";
      title.setAttribute("class", "left");
      li.appendChild(title);
      // Button element to restore queue
      var button = document.createElement("button");
      button.setAttribute("class", "btn");
      button.setAttribute("data-queue", i); // Position in list (ID is -1 for all saved queues)
      button.textContent = "Restore";
      var span = document.createElement("span");
      span.setAttribute("class", "right");
      span.appendChild(button);
      li.appendChild(span);
      list.appendChild(li);
    }
  }
  // Listen to clicks on list
  list.addEventListener("click", onSavedListClick);
  if (savedCount === 0) {
    queuesInfo.textContent = "No saved queues";
  }
}

document.addEventListener("DOMContentLoaded", getBackgroundInfo);
