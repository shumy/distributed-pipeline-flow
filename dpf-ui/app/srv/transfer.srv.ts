import { ClientRouter } from '../../lib/rts-ws-client';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Rx';

@Injectable()
export class TransferService {
  private proxy: TransferProxy

  constructor(router: ClientRouter) {
    this.proxy = router.createProxy('transfers') as TransferProxy
  }

  transferPatients(patientIds: any, srvPointId: string) {
    //TODO: transfer patients dataset, selected from the search view?
    return this.proxy.transferPatients(patientIds, srvPointId)
      .catch(error => console.log('ERROR transferPatients: ', error))
  }

  patientTransfers(srvPointId: string): Promise<IPatientTransfer[]> {
    //TODO: consult dpf-server to aquire srv-point transfers
    //TODO: cache results
    //TODO: patientTransferUpdates will update this cache?
    return this.proxy.patientTransfers(srvPointId)
      .catch(error => console.log('ERROR patientTransfers: ', error))
  }
}

export interface IPatientTransfer {
  id: string  //PatientID
  transferred: number
  errors: number
  lastErrorMessage: string
}

interface TransferProxy {
  transferPatients(patientIds: any[], srvPointId: string): Promise<void>
  patientTransfers(srvPointId: string): Promise<IPatientTransfer[]>
}