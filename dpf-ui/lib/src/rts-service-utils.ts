import { Observable, Subscriber } from 'rxjs/Rx';
import { ClientRouter } from './rts-client-service';

export type EventType = 'nxt' | 'clp'
export type OperType = 'add' | 'upd' | 'rem'

export interface Event {
  uuid: string
  type: EventType
  event?: any
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
      let event = ctx.message.args[0] as Event
      this.fireEvent(event)
    })
  }

  create(uuid: string): RemoteObserver {
    console.log('created-observable: ', uuid)
    return new RemoteObserver(this, uuid)
  }
 
  fireEvent(event: Event) {
    console.log('fire-event: ', event)
    let obs = this.observers.get(event.uuid)
    if (obs) {
      if (event.type === 'nxt')
        obs.sub.next(event)
      else
        obs.sub.complete()
    }
  }
}

class RemoteObserver {
  public sub: Subscriber<Event>
  public obs: Observable<Event>

  constructor(private parent: RemoteObservers, private uuid: string) {
    this.obs = new Observable<Event>(sub => this.sub = sub )
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