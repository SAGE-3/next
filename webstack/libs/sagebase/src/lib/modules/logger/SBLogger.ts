import { FluentClient } from '@fluent-org/logger';

export type SBLogConfig = {
  server: string;
  port: number;
  collections: string[];
};

// A Logger to send logs to Fluentd
class Logger {
  private _logger!: FluentClient;
  private _config!: SBLogConfig;

  public init(config: SBLogConfig) {
    this._config = config;
    this._config.collections = this._config.collections.map((c) => c.toLowerCase());
    this._logger = new FluentClient('sagebase', {
      socket: {
        host: config.server,
        port: config.port,
      },
    });
  }

  public log(collection: string, tag: string, data: any) {
    if (!this._logger) return;
    if (!this._config.collections.includes(collection.toLowerCase())) return;
    this._logger.emit(tag, data);
  }
}

export const SBLogger = new Logger();
