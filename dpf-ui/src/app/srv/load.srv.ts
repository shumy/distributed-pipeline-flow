import { Observable } from 'rxjs/Rx';

export interface IndexResult {
  file: string
}

export interface LoadProxy {
  indexFiles(files: string[]): Promise<Observable<IndexResult>>
}