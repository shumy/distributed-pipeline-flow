import { Observable, Subscriber } from 'rxjs/Rx';
import { ClientRouter } from './rts-client-service';

export type CmdType = 'nxt' | 'clp'
export type OperType = 'add' | 'upd' | 'rem'

export interface Event {
  uuid: string
  data?: any
}

export interface Change {
  oper: OperType
  data?: any
}

export class RemoteObservers {
  proxy: ObserverProxy
  observers = new Map<string, RemoteObserver>()

  constructor(private router: ClientRouter) {
    this.proxy = router.createProxy('observables') as ObserverProxy
    router.pipeline.addService('events', (ctx) => {
      let event = ctx.message.res as Event
      let obs = this.observers.get(event.uuid)
      if (obs) {
        if (ctx.message.cmd === 'nxt')
          obs.sub.next(event.data)
        else
          obs.sub.complete()
      }
    })
  }

  create(uuid: string): RemoteObserver {
    console.log('created-observable: ', uuid)
    return new RemoteObserver(this, uuid)
  }
}

class RemoteObserver {
  sub: Subscriber<any>
  obs: Observable<any>

  constructor(private parent: RemoteObservers, private uuid: string) {
    this.obs = new Observable<any>(sub => this.sub = sub )
    this.parent.observers.set(uuid, this)
  }

  unregister() {
    let sub = this.parent.observers.get(this.uuid)
    if (sub) {
      this.parent.observers.delete(this.uuid)
      this.parent.proxy.unregister(this.uuid)
        .then(_ => console.log('unregistered-observable: ', this.uuid))
        .catch(error => console.log('error-unregistering-observable: ', this.uuid, error))
    }
  }
}

interface ObserverProxy {
  unregister(uuid: string): Promise<void>
}