SAGE3 January 2022

New
~~~
- Update server to 1.0.0-alpha.3. 
- Add Hawaii server in Electron  client menu  (in case  of server
  failure) 
- Pdf page behavior more like SAGE2: adding page increase window width
  and removing page decreasing window width accordingly. 
- Add showui/hideui commands for Alfred. 
- Pdf hack/optimization - rendering the next-next page when navigating
  to next page. 
- Optimize a bit the pdf rendering in backend and change to rendering
  resolution (instead of fixed scaling factor, try to get a certain
  resolution, since documents have very varied view boxes). 
- Add 'f' shortcut for pdf viewer to fit the window to page (using the
  first page to calculate aspect ratio) 
- Open images from asset manager with correct aspect ratio. 
- Add a fileExist function. 
- Update server to alpha.2. 
- Upgrade PDF modules, reduce resolution (it was 8K now) and reduce
  quality of images a little. PDF/A seems to be faster too. 
- Updated license file. 
- Draft license. 

Fix
~~~
- Tiny tweaks to hiding  buttons. 
- Lint/doc. 
- Handle multi-page pdf  better (not perfect) 
- Use shift-tab instead of tab to create a new postit. 
- License header in code files. 
- Forgot  a comma in config file. 
- Updated versions of electron client packages. 

Other
~~~~~
- Merge pull request #361 from SAGE-3/hide-menu-icons. 
- Change hide/shoe UI button's icon and color. [Tabalbar]
- Merge pull request #359 from SAGE-3/context-menu. 
- Removed commented styles and added some comments. [Tabalbar]
- Added a check to see if clicking on right div. [Tabalbar]
- Reordered menu buttons. [Tabalbar]
- Created list of buttons for context menu to show all apps, clear
  board, hide/show UI. [Tabalbar]
- Created context menu. [Tabalbar]
- Test: electron v17 beta to debug flickering in win11. 
- Merge pull request #355 from SAGE-3/HideMenus. 
- Lint. 
- Changed buttons to hide/show menu on client wall. [Tabalbar]
- Added buttons to the wall client. [Tabalbar]
- Created a function to hide all menus. [Tabalbar]
- Created a button to hide user avatars & global function to hide menus.
  [Tabalbar]
- Fixed bug: deleted props.hideMenuPixels & got element width
  automatically. [Tabalbar]
- Added Buttons to hide menus. [Tabalbar]
- Merge pull request #356 from SAGE-3/improve-pdf. 
- Lint. 
- Merge branch 'main' into dev. 
- Merge branch 'master' of https://github.com/SAGE-3/sage3. [mahdi B]
- Updated task scheduler to always create a new queue. [mahdi B]
- Merge pull request #352 from SAGE-3/license. 
- Merge branch 'dev' into license. 
- Merge branch 'dev' into license. 


