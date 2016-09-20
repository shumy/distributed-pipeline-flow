import { Observable } from 'rxjs/Rx';

export interface IPatientTransfer {
  id?: string  //PatientID
  error?: string
}

export interface TransferProxy {
  transferPatients(patientIds: any[], srvPointId: string): Promise<Observable<IPatientTransfer>>
  downloadPatients(patientIds: any[], fileName: string): Promise<Observable<IPatientTransfer>>
}