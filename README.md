## Chrome Extension

This chrome extension adds a stack for your tabs in chrome, allowing a workflow where you can "put stuff aside" while looking up something else, and then come back to what you did before.

### Installation

As of now, you can only install this for chrome locally. To do that, enable developer mode at the chrome extensions page, select "Load unpacked extension" and navigate to the WebStack folder.
There are some default keybindings to open/close/replace tabs. You can view and change these at the chrome extension page (click the key bindings button at the bottom right corner).

### TODO list and changelog

- [x] Ignore empty tabs
- [x] Fix favicon when pushed before the site has loaded
- [x] Allow deleting/opening tabs and frames
- [x] Allow reordering of Tabs
- [x] Add Badge displaying number of items on stack
- [x] Add keybinding for push/pop
- [ ] Save and restore the browsing history with the tab
- [ ] Fix issue where loading pages block opening of the popup
- [ ] Add proper icon(s) and stylesheets, and fix css disasters
  - [x] Add delete/open buttons to frames (need space first)
  - [ ] Fix bug where tabs refuse to get dropped in the drop area
  - [x] Fix an issue where tab icons or their placeholders seem to randomly change size when being dragged around
- [ ] Make this more accessible to the average user (rewrite the description, maybe publish this in the chrome web store)

### License
This project is released under the MIT License. See the "LICENSE" file for details.

