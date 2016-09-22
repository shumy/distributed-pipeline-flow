import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Rx';

import { config } from '../app.config';

@Injectable()
export class DicoogleService {
  public debounceDuration = 400

  host: string
  
  constructor (private http: Http) {
    this.host = config.dicoogleHost
  }

  tagsFor(uid: string) {
    return this.http
      .get('http://' + this.host + '/dump?uid=' + uid)
      .map(_ => _.json().results.fields)
      .map(fields => {
        let res = []
        Object.keys(fields).forEach(key => res.push([ key, fields[key] ]))
        return res
      })
  }

  search(query: Observable<string>, transform?: (results: any) => void): Observable<any> {
    return query.debounceTime(this.debounceDuration)
      .distinctUntilChanged()
      .filter(_ => { if (_) return true })
      .switchMap(_ => this.rawSearch(_).map(transform))
  }

  rawSearch(query: string): Observable<any> {
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