import { Config } from '../app.config';

export type MessageType = 'status'
export type DeltaType = 'all' | 'update'

export interface Message {
  type: MessageType
  delta: DeltaType
  data: any
}

export class NotificationSrv {
  filters: { [key: string]: (msg: Message) => void } = {}

  _ready = false
  serviceURL: string
  websocket: WebSocket

  constructor(private config: Config) {
    this.serviceURL = 'ws://' + this.config.host + '/notification'
    this._bind()
  }

  ready() { this._ready = true }

  filter(type: string, callback: (msg: Message) => void) {
    this.filters[type] = callback
  }

  private _bind() {
    this.websocket = new WebSocket(this.serviceURL)

    this.websocket.onmessage = (evt) => {
      let msg = JSON.parse(evt.data)
      this._process(msg)
    }

    this.websocket.onclose = () => {
      setTimeout(() => { this._bind() }, 3000) // try reconnection
    }
  }

  private _process(msg: Message) {
    if (this._ready) {
      console.log('NOTIFICATION: ', msg)
      let filterCallback = this.filters[msg.type]
      if (filterCallback) {
        filterCallback(msg)
      } else {
        let allCallback = this.filters['*']
        if (allCallback) {
          allCallback(msg)
        } else {
          console.log('No filter available for: ', msg.type)
        }
      }
    } else {
      setTimeout(() => { this._process(msg) }, 500) // try until ready
    }
  }
}
