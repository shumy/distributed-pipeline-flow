import { config } from '../app.config';
import { ClientRouter } from '../../lib/rts-ws-client';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Rx';

@Injectable()
export class TransferService {
  private proxy: TransferProxy

  constructor(router: ClientRouter) {
    this.proxy = router.createProxy('transfers') as TransferProxy
  }

  srvPoints(): Promise<ISrvPoint[]> {
    //TODO: cache results
    //TODO: srvPointObserver will update this cache?
    return this.proxy.srvPoints()
      .catch(error => console.log('ERROR srvPoints: ', error))
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
  srvPoints(): Promise<ISrvPoint[]>
}