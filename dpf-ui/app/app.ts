import { Component } from '@angular/core';
import Dropzone from 'dropzone';

import { ClientRouter, ServiceClient, Pipeline, IComponent } from '../lib/rts-ws-client';

@Component({
  selector: 'body[app]',
  templateUrl: './app/app.html'
})
export class Application {
  ngOnInit() {
    //let drop = new Dropzone('div#dropzone', { url: '/file-upload' })
    
    console.log('INIT')

    let srvTest: IComponent = {
      name: 'srv:test',
      apply: (ctx) => {
        console.log('IServiceClientFactory', ctx.getObject('IServiceClientFactory'))
        let from = ctx.message.args[0]
        ctx.replyOK('Hello from ' + from)
      }
    }

    let pipeline = new Pipeline
    pipeline.failHandler = _ => console.log('PIPELINE-FAIL: ' + _)
    pipeline.addService(srvTest)
    
    let server = 'ws://localhost:9090/clt'
    let client = 'web-client'

		let router = new ClientRouter(server, client, pipeline)
    
    let srvClient = router.createServiceClient()
    let srvPing = srvClient.create('ping') as PingProxy
    srvPing.ping('Alex').then(_ => console.log('PING-OK'))
  }
}

interface PingProxy {
  ping(name: string): Promise<void>
}