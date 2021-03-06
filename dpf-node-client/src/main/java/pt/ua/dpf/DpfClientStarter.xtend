package pt.ua.dpf

import java.util.UUID
import pt.ua.dpf.proxy.ServicePointProxy
import pt.ua.dpf.services.SrvPoint
import rt.pipeline.pipe.channel.IPipeChannel
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.pipeline.pipe.channel.ReceiveBuffer
import rt.pipeline.pipe.use.ChannelService
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
	val String client = 'ss-' + UUID.randomUUID.toString
	
	new(String server) {
		this.server = server
	}
	
	def void start() {
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
		
		val cltr = new ClientRouter(server, client) => [
			pipeline => [
				addComponent(ChannelService.name, srvChannel)
				failHandler = [ println('PIPELINE-FAIL: ' + it) ]
			]
			
			val spProxy = createProxy('service-point', ServicePointProxy)
			onOpen[
				println('CLIENT-OPEN: ' + client)
				spProxy.create(SrvPoint.B => [ name = 'SP Test' ]).then[
					println('CLIENT-REGISTERED: ' + client)
				]
			]
		]
		
		cltr.run
	}
}