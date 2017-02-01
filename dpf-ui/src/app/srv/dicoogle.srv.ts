import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Rx';

import { ClientRouter }  from 'rts-ts-client';

@Injectable()
export class DicoogleService {
  public debounceDuration = 400

  constructor (private http: Http, private router: ClientRouter) {}

  tagsFor(uid: string) {
    return this.get('/proxy/dumpDIM/' + uid)
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
    return this.get('/proxy/searchDIM/' + query)
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

  private get(url: string) {
    if (this.router.authMgr.isLogged) {
      let headers = new Headers({ 'Authorization': `Bearer ${this.router.authMgr.authInfo.token}` })
      let options = new RequestOptions({ headers: headers })
      return this.http.get(url, options)
    }
    
    return this.http.get(url)
  }
}