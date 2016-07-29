import { Observable } from 'rxjs/Rx';
import { ClientRouter, ServiceClient, Pipeline, PipeContext } from '../../lib/rts-ws-client';

export type DeltaType = 'add' | 'update' | 'remove'

export interface ChangeEvent<DATA> {
  type: DeltaType
  data: DATA
}

export class ServiceObservable<DATA> extends Observable<ChangeEvent<DATA>> {
  constructor(address: string) {
    super(observer => {

    })
  }
}

interface PingProxy {
  ping(name: string): Promise<void>
}

export function initServices() {
  console.log('INIT-SERVICES')
  
  let srvTest = (ctx: PipeContext) => {
    console.log('IServiceClientFactory', ctx.getObject('IServiceClientFactory'))
    let from = ctx.message.args[0]
    ctx.replyResultOK('Hello from ' + from)
  }

  let pipeline = new Pipeline
  pipeline.failHandler = _ => console.log('PIPELINE-FAIL: ' + _)
  pipeline.addService('test', srvTest)

  let server = 'ws://localhost:9090/clt'
  let client = 'web-client'

  let router = new ClientRouter(server, client, pipeline)

  let srvPing = router.createProxy('ping') as PingProxy
  srvPing.ping('Alex').then(_ => console.log('PING-OK')).catch(_ => console.log('PING-ERROR: ', _) )
}
