package pt.ua.dpf

import pt.ua.dpf.test.PingProxy
import pt.ua.dpf.test.TestService
import rt.pipeline.pipe.channel.IPipeChannel
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.pipeline.pipe.channel.ReceiveBuffer
import rt.pipeline.pipe.use.ChannelService
import rt.pipeline.promise.AsyncUtils
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
		AsyncUtils.setDefault
		
		val srvChannel = new ChannelService {
			override request(PipeChannelInfo chInfo) {
				//throw new RuntimeException('Channel rejected!')
				//just accept...
				println('CHANNEL-REQ: ' + chInfo.uuid)
			}
			
			override bind(IPipeChannel channel) {
				println('CHANNEL-BIND: ' + channel.info.uuid)
				val receiver = channel.buffer as ReceiveBuffer
				receiver.onBegin[ path |
					println('FILE: ' + path)
					receiver.writeToFile(path)[ println('WRITE-FILE-OK: ' + path) ]
				]
			}
		}
		
		//TODO: router should have the client credentials...
		new ClientRouter(server, client) => [
			pipeline => [
				addChannelService(srvChannel)
				addService('test', new TestService)
				failHandler = [ println('PIPELINE-FAIL: ' + it) ]
			]
			
			serviceClient => [
				create('srv:ping', PingProxy) => [
					ping('Simon').then[ println('PING-OK') ]
				]
			]
		]
	}
}