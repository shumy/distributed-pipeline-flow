import { Observable, Subscriber } from 'rxjs/Rx';
import { ClientRouter, RemoteObservers, Pipeline } from '../../lib/rts-ws-client';

export * from '../../lib/rts-ws-client';

export function initServices() {
  console.log('INIT-SERVICES')
  
  let server = 'ws://localhost:9090/clt'
  let client = 'web-client'
  
  let pipeline = new Pipeline
  pipeline.failHandler = error => console.log('PIPELINE-FAIL: ' + error)

  let router = new ClientRouter(server, client, pipeline)
  let subs = new RemoteObservers(router)
  /*subs.create().then(observable => {
    observable.subscribe(_ => console.log('SUB: ', _))
  }).catch(error => console.log('Error: ', error))*/
}
