
export class ClientRouter {
  _ready = false
  url: string
  
  resource: any = null //PipeResource
  websocket: WebSocket

  constructor(private server: string, private client: string, private pipeline: any) {
    this.url = server + '?client=' + client

    this.bind()
  }

  ready() { this._ready = true }

  send(msg: any) {
    waitReady => { this.websocket.send(JSON.stringify(msg)) }
  }

  private waitReady(callback: () => void) {
    if (this.websocket.readyState === 1) {
      callback()
    } else {
      setTimeout => { this.waitReady(callback) }
    }
  }

  private bind() {
    this.websocket = new WebSocket(this.url)

    this.websocket.onopen = (evt) => {
		  this.resource = this.pipeline.createResource(this.server, (msg) => {}, () => {})
    }

    this.websocket.onclose = () => {
      if (this.resource == null) {
        this.resource.release
        this.resource = null
        this.websocket = null
      }

      setTimeout(() => { this.bind() }, 3000) // try reconnection
    }

    this.websocket.onerror = (evt) => {
      console.log('WS-ERROR: ', evt)
    }

    this.websocket.onmessage = (evt) => {
      let msg = JSON.parse(evt.data)
      this.receive(msg)
    }
  }

  private receive(msg: any) {
		this.resource.process(msg)
	}
}