import { config } from '../app.config';
import { ClientRouter, RemoteObservers, Change } from '../../lib/rts-ws-client';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Rx';

@Injectable()
export class TransferService {
  private proxy: TransferProxy

  constructor(router: ClientRouter, private observers: RemoteObservers) {
    this.proxy = router.createProxy('transfers') as TransferProxy
  }

  srvPoints(): ISrvPoint[] {
    //TODO: consult dpf-server to aquire srv-points
    //TODO: cache results
    //TODO: srvPointUpdates will update this cache?
    return null
  }

  srvPointObserver(): Promise<Observable<Change>> {
    return this.proxy.srvPointObserver()
      .then(uuid => { return this.observers.create(uuid).obs })
      .catch(error => console.log('ERROR srvPointObserver: ', error))
  }

  transferPatients(patients: any, srvPointId: string) {
    //TODO: transfer patients dataset, selected from the search view?
  }

  patientTransfers(srvPointId: string): IPatientTransfer[] {
    //TODO: consult dpf-server to aquire srv-point transfers
    //TODO: cache results
    //TODO: patientTransferUpdates will update this cache?
    return null
  }

  patientTransferObserver(srvPointId: string): Promise<Observable<Change>> {
    return null
  }
}

export interface ISrvPoint {
  id: string
  name: string
}

export interface IPatientTransfer {
  id: string  //PatientID
  transferred: number
  errors: number
  lastErrorMessage: string
}

interface TransferProxy {
  srvPointObserver(): Promise<string>
}