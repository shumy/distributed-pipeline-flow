package pt.ua.dpf.test

import rt.plugin.service.an.Service
import rt.plugin.service.an.Public
import pt.ua.dpf.services.PingInterface
import rt.plugin.service.an.Proxy
import rt.plugin.service.an.Proxies
import rt.pipeline.pipe.IPipeChannel.PipeChannelInfo
import rt.vertx.server.ChannelProxy

@Service(PingInterface)
class PingService {
	
	@Public
	@Proxies(@Proxy(name = 'test', proxy = TestProxy), @Proxy(name = 'channel', proxy = ChannelProxy))
	def void ping(String name) {
		test.hello(name).then[
			println('HELLO-OK: ' + it)
		]
		
		channel.requestChannel(new PipeChannelInfo).then([
			println('CHANNEL-REQ-OK')
			send('Send bytes!'.bytes)
			close
		], [ println('CHANNEL-REQ-ERROR: ' + it) ])
	}
}