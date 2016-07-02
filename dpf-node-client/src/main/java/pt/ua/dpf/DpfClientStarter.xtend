package pt.ua.dpf

import rt.ws.client.ClientRouter
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
		//TODO: router should have the client credentials...
		new ClientRouter(server, client) => [
			pipeline => [
				addService('test', new TestService)
				failHandler = [ println('PIPELINE-FAIL: ' + it) ]
			]
			
			serviceClient => [
				create('ping', PingProxy) => [
					ping('Simon').then[ println('PING-OK') ]
				]
			]
		]
	}
}