import { ClientRouter } from '../../lib/rts-ws-client';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Rx';

import { SubscriberService } from '../srv/services';

@Injectable()
export class TransferService {
  private proxy: TransferProxy

  constructor(private subsSrv: SubscriberService, router: ClientRouter) {
    this.proxy = router.createProxy('transfers') as TransferProxy
  }

  transferPatients(patientIds: any, srvPointId: string) {
    return this.proxy.transferPatients(patientIds, srvPointId)
      .then(address => this.subsSrv.create(address))
      //.catch(error => console.log('ERROR transferPatients: ', error))
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
  id?: string  //PatientID
  error?: string
}

interface TransferProxy {
  transferPatients(patientIds: any[], srvPointId: string): Promise<string>
  patientTransfers(srvPointId: string): Promise<IPatientTransfer[]>
}