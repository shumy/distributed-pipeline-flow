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
  }

  patientTransfers(srvPointId: string): Promise<IPatientTransfer[]> {
    return this.proxy.patientTransfers(srvPointId)
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