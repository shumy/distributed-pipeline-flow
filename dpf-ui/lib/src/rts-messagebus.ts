export class MessageBus {
    listeners = new Map<string, Set<Listener>>()
    private replyListeners = new Map<string, (IMessage) => void>()

	publish(address: string, msg: IMessage) {
		if (msg.cmd === CMD.OK || msg.cmd === CMD.ERROR) {
            let replyFun = this.replyListeners.get(address)
            if (replyFun) {
                this.replyListeners.delete(address)
                replyFun(msg)
            }
		} else {
			let holder = this.listeners.get(address)
            if (holder)
                holder.forEach(_ => _.send(msg))
		}
	}
	
	send(address: string, msg: IMessage, replyCallback: (msg: IMessage) => void) {
		let replyID = msg.clt + '+' + msg.id
		this.replyListeners.set(replyID, replyCallback)

		this.publish(address, msg)
		setTimeout(_ => {
            let replyFun = this.replyListeners.get(replyID)
            if (replyFun) {
                this.replyListeners.delete(replyID)
                let reply: IMessage = { id: msg.id, clt: msg.clt, cmd: CMD.ERROR, res: 'Timeout for ' + msg.path + '->' + msg.cmd } 
                replyFun(reply)
            }
        }, 3000)
	}
	
	listener(address: string, callback: (msg: IMessage) => void) {
		let holder = this.listeners.get(address)
		if (!holder) {
			holder = new Set<Listener>()
			this.listeners.set(address, holder)
		}
		
		let rtsListener = new Listener(this, address, callback)
		holder.add(rtsListener)
		
		return rtsListener
	}
}

export class Listener {
    constructor(private parent: MessageBus, private address: string, private callback: (msg: IMessage) => void) {}

    send(msg: IMessage) {
        this.callback(msg)
    }
		
    remove() {
        let holder = this.parent.listeners.get(this.address)
        if (holder)
            holder.delete(this)
    }
}

export interface IMessage {
    id?: number
    clt?: string
    cmd?: string
    path?: string

    args?: any[]

    res?: any
    error?: string
}

export class CMD {
    static OK = 'ok'
    static ERROR = 'error'
}