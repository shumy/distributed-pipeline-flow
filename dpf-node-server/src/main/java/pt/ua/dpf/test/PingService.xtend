package pt.ua.dpf.test

import rt.plugin.service.an.Service
import rt.plugin.service.an.Public
import pt.ua.dpf.services.PingInterface
import rt.plugin.service.an.Proxy
import rt.plugin.service.an.Proxies
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.vertx.server.ChannelProxy
import rt.pipeline.pipe.channel.IPipeChannel

@Service(PingInterface)
class PingService {
	
	@Public
	@Proxies(@Proxy(name = 'test', proxy = TestProxy), @Proxy(name = 'channel', proxy = ChannelProxy))
	def void ping(String name) {
		test.hello(name).then[
			println('HELLO-OK: ' + it)
		]
		
		val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
		channel.request(reqInfo).then([
			val sender = it as IPipeChannel
			println('CHANNEL-REQ-OK')
			//sender.send('Send bytes!'.bytes)
			sender.close
		], [ println('CHANNEL-REQ-ERROR: ' + it) ])
	}
}