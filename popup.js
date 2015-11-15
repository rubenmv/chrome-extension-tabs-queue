/*global chrome, FileReader, window, document, console, Sortable*/
"use strict";

var bgPage = chrome.extension.getBackgroundPage(),
  queueId = null;

/**
 * Opens clicked item on current tab
 */
function openItemInCurrentTab(evt) {
  evt.stopPropagation();
  if (evt.target.className !== "item-url") {
    return;
  }
  // Update current tab url
  chrome.tabs.update({
    url: evt.target.textContent
  });
  // Remove element from queue and storage, only if not locked
  // value (int) was added on getBackgroundInfo() when creating li elements
  var parent = evt.target.parentNode;
  var lock = parent.getElementsByClassName("item-lock")[0];
  if (lock && lock.getAttribute("data-checked") === "false") {
    bgPage.removeItem(queueId, parent.value); // window/queue, tab index
  }
  window.close();
}

/**
 * Update index/value attribute on list items and update queue
 */
function reindex(oldPos, newPos) {
  var items = document.getElementById("url-list").getElementsByClassName("list-item");
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
  var remove = e.target.getElementsByClassName("item-remove")[0];
  remove.style.display = remove.style.display === "none" ? "inline" : "none";
}

/**
 * Ask for confirmation and calls clear all items
 */
function toggleClearConfirm() {
  var clearButton = document.getElementById("button-clear");
  var confirmDialog = document.getElementById("clearConfirm");

  clearButton.style.display = clearButton.style.display !== "none" ? "none" : "inline-block";
  confirmDialog.style.display = confirmDialog.style.display !== "none" ? "none" : "inline-block";
}

/**
 * Enable/disable item lock 
 */
function toggleLock(e) {
  var liElement = e.target.parentNode;
  var state = false;
  if (e.target.getAttribute("data-checked") === "false") { // toggle
    state = true;
  }
  e.target.setAttribute("data-checked", state.toString());
  var image = state ? "images/lock-enabled.png" : "images/lock-disabled.png";
  e.target.setAttribute("src", image);
  bgPage.setLock(queueId, liElement.value, state);
}

/**
 * Clear all items in current queue
*/
function onClearAll() {
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
 * Remove item
 */
function deleteItem(e) {
  var liElement = e.target.parentNode;
  liElement.parentNode.removeChild(liElement);
  bgPage.removeItem(liElement.value); // index
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
    var info = document.getElementById("url-list-info"),
      urlList = document.getElementById("url-list"),
      urlArray = bgPage.getQueue(queueId).items;
    if (urlArray.length > 0) {
      //var list = document.getElementById("my-ui-list");
      //Sortable.create(urlList); // That"s all.
      Sortable.create(urlList, {
        animation: 150, // ms, animation speed moving items when sorting, `0` — without animation
        handle: ".handle", // Restricts sort start click/touch to the specified element
        onEnd: function (evt) {
          reindex(evt.oldIndex, evt.newIndex);
        }
      });
      info.textContent = "Queue in this window";
      for (var i = 0; i < urlArray.length; i++) { 
        // Append item to list
        urlList.appendChild(createItem(i, urlArray[i].url, urlArray[i].locked));
        // Finally add listener to close popup and open link in active tab
        urlList.addEventListener("click", openItemInCurrentTab);
      }
    } else {
      info.textContent = "Queue is empty";
    }
  });

  loadSavedQueues();
  document.getElementById("buttonRestoreAll").addEventListener("click", onRestore);

  // After init add the other listeners
  var switchButton = document.getElementById("myonoffswitch");
  switchButton.checked = bgPage.isActive;
  document.getElementById("button-clear").addEventListener("click", toggleClearConfirm);
  // Listener for clear confirm dialog
  document.getElementById("clearYes").addEventListener("click", onClearAll);
  document.getElementById("clearNo").addEventListener("click", toggleClearConfirm);
  document.getElementById("clearConfirm").style.display = "none";
  
  //document.getElementById("button-queueall").addEventListener("click", bgPage.queueAllTabs);
  switchButton.addEventListener("change", onSwitchChanged);
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

/**
 * 
 */
function loadSavedQueues() {
  var
    qus = bgPage.queues,
    list = document.getElementById("savedQueuesList"),
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
    list.innerHTML = "<li>No saved queues</li>";
  }
}

document.addEventListener("DOMContentLoaded", getBackgroundInfo);
