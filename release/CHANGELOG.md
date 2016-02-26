# Change log
All notable changes to this project will be documented in this file. This one shows every version released and not released to the public.

### [2.0.2] 2016-02-26
- Minor changes, removed unnecessary stuff. Removed minified.js and email-utils.

### [2.0.1] 2016-02-26
- Removed feedback form. Mandrill service is no longer free. 

## [2.0.0] 2016-01-25
- Added inverse mode option. New items will be added to the top of the queue.
- Added slow network mode. Sets a new limit for loading tabs.
- Added queue migration from version 1.0.
- "Queue to fit limit" button removed. Now works with a click on title.
- Improved looks, less wasted space in popup.
- Merge button in saved queues.
- Preview items in saved queues.
- Date and time for saved queues names.

## [1.1.4] 2015-11-20
- "Queue to fit limit" button to queue tabs that exceed the current limit.
- Two modes for the queue to fit limit button: queue tabs on the right or by most recently opened.

## [1.1.3] 2015-11-19
- Button to clear all queues.
- Restore and remove buttons for saved queues items (popup).
- Reduces the number of event listeners for buttons in list items (popup).

## [1.1.2] 2015-11-16
- Open queue items manually in a new tab with ctrl+click/middle mouse button.
- Items opened manually override the tab limit, so they won't get queued again.

## [1.1.1] 2015-11-15
- Separate queues per window.
- "Clear all" confirmation dialog.
- Basic saved queues management.
- Drag and drop items to manually sort current queue.
- Restore queues manually or automatically (on start).
- Button to enable/disable the extension functionality.
- Different icon to identify the state of the extension.
- Lock items in queue. Won't load automatically or be deleted on click.
- By default duplicated urls won't queue and will move the existing item to the top of the queue.
- Option to enable/disable duplicates.
- Added feedback module to options page.

## [1.0.0] 2014-09-10
- Add items to queue depending on limit.
- Open items in queue when there is enough space.
- Button to clear all items.
- Show list of url/tabs on popup window when icon is clicked.