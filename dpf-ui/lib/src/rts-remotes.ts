import { Observable, Subscriber } from 'rxjs/Rx';

export type CmdType = 'ev:nxt' | 'ev:clp' | 'ev:err'
export type ReqType = 'init' | 'connect' | 'disconnect' | 'complete'

export interface EventProcessor {
  process(cmd: CmdType, data: any)
}

abstract class BaseObservable<D> extends Observable<D> implements EventProcessor {
  protected sub: Subscriber<any[]>
  connected = false

  constructor(public address: string, protected reqCallback: (remote: any, req: ReqType) => void) {
    super(sub => { this.sub = sub })
  }

  connect() {
    if (!this.connected)
      this.reqCallback(this, 'connect')
  }

  disconnect() {
    if (this.connected)
      this.reqCallback(this, 'disconnect')
  }

  process(cmd: CmdType, data: any) {
    if (cmd === 'ev:nxt') {
      this._onEvent(data)
    } else if (cmd === 'ev:clp') {
      this.sub.complete()
      this.reqCallback(this, 'complete')
    } else if (cmd === 'ev:err') {
      this.sub.error(data)
      //TODO: disconnect on error? (optional)
    }
  }

  protected abstract _onEvent(_evt: any)
}

export type OperType = 'add' | 'remove' | 'select' | 'unselect'
export type ChangeOper = 'init' | 'add' | 'rem'

export class Entry {
  id: any
	data: any
}

export class Repository extends BaseObservable<any[]> {
  private data = new Map<any, any>()
  private operCallback = {}

  defSelected: Entry
  selected: Entry

  constructor(address: string, reqCallback: (remote: any, req: ReqType) => void) {
    super(address, reqCallback)
  }

  init(entries: Entry | Entry[]) {
    this.data.clear()

    if (entries.constructor === Array) {
      (entries as Entry[]).forEach(entry => this.data.set(entry.id, entry.data))
    } else {
      let entry = entries as Entry
      this.data.set(entry.id, entry.data)
    }

    this.reqCallback(this, 'init')
    return this
  }

  defaultSelect(id: any) {
    this.select(id)
    this.defSelected = this.selected
    return this
  }

  select(id: any) {
    console.log('SELECT: ', id)
    if (this.selected) {
      let onUnSelect = this.operCallback['unselect']
      if (onUnSelect)
        onUnSelect(this.selected)
    }

    let dataSelected = this.data.get(id)
    if (dataSelected) {
      this.selected = { id: id, data: dataSelected }
      let onSelect = this.operCallback['select']
      if (onSelect)
        onSelect(this.selected)
    }

    return this
  }

  on(oper: OperType, callback: (data?: Entry) => void) {
    this.operCallback[oper] = callback
    return this
  }

  add(_id: string, _data: any) {
    this._onEvent({ oper: 'add', id: _id, data: _data})
    return this
  }

  remove(_id: any) {
    this._onEvent({ oper: 'rem', id: _id })
    return this
  }

  notify() {
    if (this.sub) {
      let newData = []
      this.data.forEach((v, k) => newData.push({ id: k, data: v }))
      this.sub.next(newData)
    }
  }

  protected _onEvent(_evt: any) {
    let chOper: ChangeOper = _evt.oper

    if (chOper === 'add') {
      let onAdd = this.operCallback['add']
      if (onAdd)
        onAdd(_evt)
      
      this.data.set(_evt.id, _evt.data)
    } else if (chOper === 'rem') {
      _evt.data = this.data.get(_evt.id)
      this.data.delete(_evt.id)

      let onRemove = this.operCallback['remove']
      if (onRemove)
        onRemove(_evt)

      if (this.selected && this.selected.id === _evt.id) {
        if (this.defSelected)
          this.select(this.defSelected.id)
        else
          this.select(undefined)
      }
    } else if (chOper === 'init') {
      let onAdd = this.operCallback['add']
      Object.keys(_evt.data).forEach(key => {
        let entry: Entry = { id: key, data: _evt.data[key] } 
        this.data.set(entry.id, entry.data)
        if (onAdd)
          onAdd(entry)
      })
    }

    this.notify()
  }
}

export class RemoteObservable extends BaseObservable<any> {
  constructor(address: string, reqCallback: (remote: any, req: ReqType) => void) {
    super(address, reqCallback)
  }

  protected _onEvent(_evt: any) {
    this.sub.next(_evt)
  }
}