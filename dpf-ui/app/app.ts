import { Component } from '@angular/core';
import { ROUTER_DIRECTIVES } from '@angular/router';

import { ClientRouter, ServiceClient, Pipeline, PipeContext } from '../lib/rts-ws-client';

@Component({
  selector: 'body[app]',
  directives: [ROUTER_DIRECTIVES],
  templateUrl: './app/app.html'
})
export class Application {
  jQueryInit() {
    let modal: any = $('.ui.modal')
    modal.modal({
      closable: false,
      transition: 'fly down',
      offset: 2000
    })
  }

  ngOnInit() {
    this.jQueryInit()

    //let drop = new Dropzone('div#dropzone', { url: '/file-upload' })
    
    /*
    console.log('INIT')

    let srvTest = (ctx: PipeContext) => {
      console.log('IServiceClientFactory', ctx.getObject('IServiceClientFactory'))
      let from = ctx.message.args[0]
      ctx.replyOK('Hello from ' + from)
    }

    let pipeline = new Pipeline
    pipeline.failHandler = _ => console.log('PIPELINE-FAIL: ' + _)
    pipeline.addService('test', srvTest)
    
    let server = 'ws://localhost:9090/clt'
    let client = 'web-client'

		let router = new ClientRouter(server, client, pipeline)

    let srvPing = router.createProxy('ping') as PingProxy
    srvPing.ping('Alex').then(_ => console.log('PING-OK'))
    */
  }
}

interface PingProxy {
  ping(name: string): Promise<void>
}