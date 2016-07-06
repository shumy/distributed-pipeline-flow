package pt.ua.dpf

import rt.ws.client.ClientRouter
import pt.ua.dpf.test.PingProxy
import pt.ua.dpf.test.TestService
import rt.pipeline.pipe.use.ChannelService
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import java.nio.file.Files
import java.nio.file.Paths
import java.nio.file.StandardOpenOption
import java.io.File
import rt.pipeline.pipe.channel.IPipeChannel

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
		val srvChannel = new ChannelService {
			override request(PipeChannelInfo chInfo) {
				//throw new RuntimeException('Channel rejected!')
				//just accept...
				println('CHANNEL-REQ: ' + chInfo.uuid)
			}
			
			override bind(IPipeChannel channel) {
				println('CHANNEL-BIND: ' + channel.info.uuid)
				/*channel.receive[ data |
					println('CLIENT-WRITE-FILE: ' + channel.info.uuid)
					//val file = new File('./test.txt')
					//Files.write(Paths.get(file.toURI), data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)
				]*/
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