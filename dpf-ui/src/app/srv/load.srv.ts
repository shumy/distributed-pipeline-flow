import { Observable } from 'rxjs/Rx';

export interface IndexProxy {
  indexFiles(files: string[]): Promise<Observable<string>>
}