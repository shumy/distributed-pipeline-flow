import { Http } from '@angular/http';
import { Config } from '../app.config';

export class IndexSrv {
  serviceURL: string

  constructor(private config: Config) {
    this.serviceURL = 'http://' + this.config.host + '/index'
  }

  /*
  index() {
    let body = JSON.stringify({ data: 'Micael Pedrosa' })

    this.http.post('http://localhost:9090/index', body)
      //.map(this.extractData)
      //.catch(this.handleError)
      .subscribe(result => console.log(result), error => console.log(error))
  }
  */
}
