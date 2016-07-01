import { MessageBus, Listener, IMessage, CMD } from './rts-messagebus'

export class Pipeline {
    private _failHandler: (String) => void = null

    private interceptors: ((ctx: PipeContext) => void)[] = []
	private services = new Map<string, (ctx: PipeContext) => void>()

    set failHandler(callback: (error: String) => void) {
        this._failHandler = callback
    }

	constructor(public mb: MessageBus = new MessageBus) {}

    process(resource: PipeResource, msg: IMessage, onContextCreated?: (ctx: PipeContext) => void) {
        let ctx = new PipeContext(this, resource, msg, new Iterator(this.interceptors))
        if (onContextCreated) onContextCreated(ctx)
		ctx.next()
    }

    createResource(client: string, sendCallback: (msg: IMessage) => void, closeCallback: () => void) {
		return new PipeResource(this, client, sendCallback, closeCallback)
	}

	fail(error: string) {
		if(this._failHandler != null)
			this._failHandler(error)
	}

	addInterceptor(interceptor: (ctx: PipeContext) => void) {
		this.interceptors.push(interceptor)
	}

	getServiceFromPath(path: string) {
		return this.services.get(path)
	}

	getService(address: string) {
		return this.services.get('srv:' + address)
	}

	addService(address: string, service: (ctx: PipeContext) => void) {
	    this.services.set('srv:' + address, service)
	}
	
	removeService(address: string) {
        this.services.delete('srv:' + address)
	}
}

export class PipeResource {
    subscriptions = new Map<string, Listener>()

	constructor(private pipeline: Pipeline, private client: string, private sendCallback: (msg: IMessage) => void, private closeCallback: () => void) {
		console.log('RESOURCE-CREATE ', this.client)
	}

    process(msg: IMessage, onContextCreated?: (ctx: PipeContext) => void) {
        this.pipeline.process(this, msg, onContextCreated)
	}

	send(msg: IMessage) {
        this.sendCallback(msg)
	}

	subscribe(address: string) {
        if (this.subscriptions.has(address))
            return false
		
		console.log('RESOURCE-SUBSCRIBE ', address)
		let listener = this.pipeline.mb.listener(address, this.sendCallback)
		
		this.subscriptions.set(address, listener)
		return true
	}

    unsubscribe(address: string) {
		let listener = this.subscriptions.get(address)
		if (listener) {
			console.log('RESOURCE-UNSUBSCRIBE ', address)
            this.subscriptions.delete(address)
			listener.remove()
		}
	}

	release() {
		console.log('RESOURCE-RELEASE ', this.client)
		let subs = this.subscriptions.forEach(_ => _.remove())
		this.subscriptions.clear()
	}
	
	disconnect() {
	    this.closeCallback()
	}
}

export class PipeContext {
    private objects = new Map<string, Object>()
	private inFail: boolean = false

    get bus() { return this.pipeline.mb }

    setObject(type: string, instance: Object) { this.objects.set(type, instance) }
	getObject(type: string) { return this.objects.get(type) }

	constructor(private pipeline: Pipeline, public resource: PipeResource, public message: IMessage, private iter: Iterator<(ctx: PipeContext) => void>) {}
	
	deliver() {
		if(!this.inFail) {
			if (this.message.cmd === CMD.OK || this.message.cmd === CMD.ERROR)
				this.deliverReply()
			else
				this.deliverRequest()
		}
	}

	next() {
		if(!this.inFail) {
			if(this.iter.hasNext) {
				try {
					this.iter.next().apply(this)
				} catch(error) {
					console.error(error)
					this.fail(error)
				}
			} else {
				this.deliver()
			}
		}
	}
	
	send(msg: IMessage) {
		if(!this.inFail) {
			this.resource.send(msg)
		}
	}

	fail(error: string) {
		if(!this.inFail) {
			this.replyError(error)
			this.pipeline.fail(error)
			this.inFail = true
		}
	}

	reply(replyMsg: IMessage) {
		if(!this.inFail) {
			replyMsg.id = this.message.id
            replyMsg.clt = this.message.clt
			
			this.resource.send(replyMsg)
		}
	}
	
	replyOK(result: any) {
		if(!this.inFail) {
			let replyMsg: IMessage = { cmd: CMD.OK, res: result }
			this.reply(replyMsg)
		}
	}
	
	replyError(err: string) {
		if(!this.inFail) {
			let replyMsg: IMessage = { cmd: CMD.ERROR, error: err }
			this.reply(replyMsg)
		}
	}
	
	disconnect() {
		this.resource.disconnect()
	}
	
	private publish(address: string) {
		this.pipeline.mb.publish(address, this.message)
	}
	
	private deliverRequest() {
		let srv = this.pipeline.getServiceFromPath(this.message.path)
		if (srv) {
			console.log('DELIVER(' + this.message.path + ')')
			try {
				srv(this)
			} catch(error) {
				console.error(error)
				this.fail(error)
			}
		} else {
			console.log('PUBLISH(' + this.message.path + ')')
			this.publish(this.message.path)
		}
	}
	
	private deliverReply() {
		let address = this.message.clt + '+' + this.message.id
		console.log('REPLY(' + address + ')')
		this.publish(address)
	}
}

class Iterator<T> {
    private index: number = -1

    constructor(private array: T[]) {}

    get hasNext(): boolean {
        return this.index < this.array.length - 1
    }

    next(): T {
        this.index++
        return this.array[this.index]
    }
}