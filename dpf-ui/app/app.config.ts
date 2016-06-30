import { OpaqueToken } from '@angular/core';

export let APP_CONFIG = new OpaqueToken('app.config');

export interface Config {
  host: string
}

export let config: Config = {
  host: 'localhost:9090'
}
