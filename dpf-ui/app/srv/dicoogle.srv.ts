import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Rx';

@Injectable()
export class DicoogleService {
  constructor (private http: Http) {}

  host = 'localhost:8080'
  debounceDuration = 400

  search(query: Observable<string>, transform?: (results: any) => void): Observable<any> {
    return query.debounceTime(this.debounceDuration)
                .distinctUntilChanged()
                .filter(_ => { if (_) return true })
                .switchMap(_ => this.rawSearch(_).map(transform))
  }

  rawSearch(query: string): Observable<any> {
    console.log('Dicoogle search: ', query)
    return this.http
      .get('http://' + this.host + '/searchDIM?query=' + query + '&keyword=true')
      .map(_ => _.json().results)
      .filter(_ => _.length != 0)
      .map(results => {
        results.forEach(patient => {
          patient.modalities = new Set<String>()
          patient.studies.forEach(study => patient.modalities.add(study.modalities))
        })
        return results
      })
  }
}