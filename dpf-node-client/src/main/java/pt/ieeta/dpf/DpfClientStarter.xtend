package pt.ieeta.dpf

import rt.pipeline.Registry
import pt.ieeta.dpf.test.TestService
import rt.pipeline.IMessageBus.Message
import rt.ws.client.MessageConverter
import rt.ws.client.ClientMessageBus
import rt.ws.client.ClientRouter

class DpfClientStarter {
	def static void main(String[] args) {
		val server = args.get(0)
		if (server == null) {
			println('Server URL is needed!')
			System.exit(-1)
		}
		
		new DpfClientStarter(server).start
	}
	
	val String server
	val String client = 'sss-client'
	
	new(String server) {
		this.server = server
	}
	
	def void start() {
		val converter = new MessageConverter
		val bus = new ClientMessageBus
		val registry = new Registry(client, bus)
		
		val pipeline = registry.createPipeline => [
			addService(new TestService)
			failHandler = [ println('PIPELINE-FAIL: ' + it) ]
		]
		
		//TODO: router should have the client credentials...
		val router = new ClientRouter(server, client, pipeline, converter)
		router.bind[
			router.send(new Message => [id=1L cmd='ping' client='sss-client' path='srv:ping'])
		]
	}
}