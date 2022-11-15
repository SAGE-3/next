/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

//document.addEventListener('DOMContentLoaded', function (event) {

document.addEventListener("DOMNodeInserted", function(event) {
  if (!!window && !!!window.$) {
    console.log('SAGE3> preloading Jquery');
    window.$ = window.jQuery = require('jquery');
  }
});
