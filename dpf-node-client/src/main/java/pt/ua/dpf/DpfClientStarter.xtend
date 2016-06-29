package pt.ua.dpf

import rt.ws.client.ClientRouter
import rt.pipeline.pipe.Pipeline
import rt.plugin.service.ServiceClient
import pt.ua.dpf.test.PingProxy
import pt.ua.dpf.test.TestService

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
		val pipeline = new Pipeline => [
			addService(new TestService)
			failHandler = [ println('PIPELINE-FAIL: ' + it) ]
		]
		
		//TODO: router should have the client credentials...
		val router = new ClientRouter(server, client, pipeline)
		
		val srvClient = new ServiceClient(router.bus)
		val pingProxy = srvClient.create('ping', PingProxy)
		
		//same as -> router.bus.publish(new Message => [id=1L cmd='ping' clt='sss-client' path='srv:ping' args=#['Simon']])
		pingProxy.ping('Simon').then[
			println('PING-OK')
		]
	}
}