/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

document.addEventListener("DOMNodeInserted", function(event) {
    if (!!window && !(!!window.$)) {
        // window.$ = window.jQuery = require('jquery');
    }
});
