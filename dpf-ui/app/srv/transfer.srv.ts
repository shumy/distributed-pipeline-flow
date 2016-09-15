import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Rx';

import { ClientRouter, SubscriberService } from '../app.imports';

@Injectable()
export class TransferService {
  private proxy: TransferProxy

  constructor(private subsSrv: SubscriberService, router: ClientRouter, private http: Http) {
    this.proxy = router.createProxy('transfers') as TransferProxy
  }

  transferPatients(patientIds: any, srvPointId: string) {
    return this.proxy.transferPatients(patientIds, srvPointId)
      .then(address => this.subsSrv.create(address))
  }

  downloadPatients(patientIds: any) {
    return this.proxy.downloadPatients(patientIds)
      .then(address => this.subsSrv.create(address))
  }

  fireDownload(uri: string) {
    window.location.href = uri
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
  downloadPatients(patientIds: any[]): Promise<string>
  patientTransfers(srvPointId: string): Promise<IPatientTransfer[]>
}