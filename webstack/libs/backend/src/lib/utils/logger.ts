/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { FluentClient } from '@fluent-org/logger';

// A Logger to send logs to Fluentd
export class SAGELogger {
  private _logger: FluentClient;
  constructor(host = 'localhost', port = 24224, timeout = 3000) {
    this._logger = new FluentClient('tag_prefix', {
      socket: {
        host,
        port,
        timeout,
      },
    });
  }

  public log(tag: string, data: any) {
    this._logger.emit(tag, data);
  }
}
