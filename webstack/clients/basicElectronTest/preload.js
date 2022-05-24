/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// ---------------------------------------------------------------------------
const { contextBridge } = require('electron');
// ---------------------------------------------------------------------------

// let preloadVar = {info: "this is preload.js"};
// function printPreloadValue() {
// 	console.log(preloadVar);
// }
// function getPreloadValue() {
// 	return preloadVar;
// }

console.log('preloadjsfile');

// ---------------------------------------------------------------------------
// Context bridge cannot be used unless Electron is launched with contextIsolation
//

// // Bridge requires an object. No primitive or function allowed.
// contextBridge.exposeInMainWorld("isElectron", {
// 	status: true,
// 	// ppv: printPreloadValue,
// 	// gpv: getPreloadValue,
// });
