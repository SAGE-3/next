import { FluentClient } from '@fluent-org/logger';

export type SBLogConfig = {
  server: string;
  port: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'none';
};

// A Logger to send logs to Fluentd
class Logger {
  private _logger!: FluentClient;
  private _config!: SBLogConfig;

  public init(config: SBLogConfig) {
    this._config = config;
    this._logger = new FluentClient('tag_prefix', {
      socket: {
        host: config.server,
        port: config.port,
      },
    });
  }

  public log(tag: string, data: any) {
    if (!this._logger) return;
    if (this._config.level !== 'none') {
      this._logger.emit(tag, data);
    }
  }
}

export const SBLogger = new Logger();
