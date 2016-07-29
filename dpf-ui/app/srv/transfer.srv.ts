import { config } from '../app.config';
import { ServiceObservable, ChangeEvent } from './service.common';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Rx';

@Injectable()
export class TransferService {
  srvPoints(): ISrvPoint[] {
    //TODO: consult dpf-server to aquire srv-points
    //TODO: cache results
    //TODO: srvPointUpdates will update this cache?
    return null
  }

  srvPointUpdates(): ServiceObservable<ISrvPoint> {
    return new ServiceObservable<ISrvPoint>('srv:address.method')
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

  patientTransferUpdates(srvPointId: string): ServiceObservable<IPatientTransfer> {
    return new ServiceObservable<IPatientTransfer>('srv:address.method')
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