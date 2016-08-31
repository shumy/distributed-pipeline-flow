import { Observable, Subscriber } from 'rxjs/Rx';
import { ClientRouter } from './rts-client-service';

export { ClientRouter } from './rts-client-service';
export * from './rts-auth';

export interface Event {
  address: string
  data?: any
}

export class SubscriberService {
  proxy: SubscriberProxy
  observers = new Map<string, RemoteObservable>()

  constructor(private router: ClientRouter) {
    this.proxy = router.createProxy('subscriber') as SubscriberProxy
    router.pipeline.addService('events', (ctx) => {
      let event = ctx.message.res as Event
      let obs = this.observers.get(event.address)
      if (obs) {
        if (ctx.message.cmd === 'nxt') {
          obs.sub.next(event.data)
        } else {
          obs.sub.complete()
          obs.remove()
        }
      }
    })
  }

  create(address: string): RemoteObservable {
    return new RemoteObservable(this, address, false)
  }

  subscribe(address: string): Promise<RemoteObservable> {
    console.log('subscribe: ', address)
    return this.proxy.subscribe(address)
      .then(_ => { return new RemoteObservable(this, address) })
      .catch(error => console.log('error-subscribe: ', address, error))
  }
}

class RemoteObservable extends Observable<any> {
  sub: Subscriber<any>

  constructor(private parent: SubscriberService, private address: string, private isRemoteSubscription = true) {
    super(sub => this.sub = sub)
    this.parent.observers.set(address, this)
  }

  remove() {
    let sub = this.parent.observers.get(this.address)
    if (sub) {
      this.parent.observers.delete(this.address)
      if (this.isRemoteSubscription) {
        this.parent.proxy.unsubscribe(this.address)
          .then(_ => console.log('unsubscribe: ', this.address))
          .catch(error => console.log('error-unsubscribe: ', this.address, error))
      }
    }
  }
}

interface SubscriberProxy {
  subscribe(address: string): Promise<void>
  unsubscribe(address: string): Promise<void>
}