import { OpaqueToken } from '@angular/core';

export let ServicePointToken = new OpaqueToken('ServicePointService')

export interface ServicePointService {
  srvPoints(): Promise<ISrvPoint[]>
}

export interface ISrvPoint {
  id: string
  name: string
}