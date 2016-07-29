import { Observable, Subscriber } from 'rxjs/Rx';
import { ClientRouter } from './rts-client-service';

export type DeltaType = 'add' | 'upd' | 'rem'

export interface ChangeEvent {
  type: DeltaType
  uuid: string
  data: any
}

export class ChangeObservables {
  proxy: ObservableProxy
  subscribers = new Map<string, Subscriber<ChangeEvent>>()

  constructor(private router: ClientRouter) {
    this.proxy = router.createProxy('observables') as ObservableProxy
    router.pipeline.addService('events', (ctx) => {
      let change = ctx.message.args[0] as ChangeEvent
      this.fireChange(change)
    })
  }

  create(): Promise<Observable<ChangeEvent>> {
    return new Promise((resolve, reject) => {
      this.proxy.register()
        .then(uuid => {
          console.log('created-observable: ', uuid)
          let obs = new Observable<ChangeEvent>(sub => { this.subscribers.set(uuid, sub) })
          resolve(obs)
        }).catch(error => {
          console.log('error-creating-observable: ', error)
          reject(error)
        })
    })
  }

  delete(uuid: string) {
    
    let sub = this.subscribers.get(uuid)
    if (sub) {
      this.subscribers.delete(uuid)
      this.proxy.unregister(uuid)
        .then(_ => console.log('deleted-observable: ', uuid))
        .catch(error => console.log('error-deleting-observable: ', uuid, error))
    }
  }
 
  fireChange(change: ChangeEvent) {
    //console.log('fire-change: ', change)
    let sub = this.subscribers.get(change.uuid)
    if (sub) {
      sub.next(change)
    }
  }
}

interface ObservableProxy {
  register(): Promise<string>
  unregister(uuid: string): Promise<void>
}