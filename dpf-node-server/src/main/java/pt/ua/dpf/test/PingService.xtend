package pt.ua.dpf.test

import rt.plugin.service.an.Service
import rt.plugin.service.an.Public
import pt.ua.dpf.services.PingInterface
import rt.plugin.service.an.Proxy
import rt.plugin.service.an.Proxies
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.vertx.server.ChannelProxy
import rt.pipeline.pipe.channel.SendBuffer

@Service(PingInterface)
class PingService {
	
	@Public
	@Proxies(@Proxy(name = 'test', proxy = TestProxy), @Proxy(name = 'channel', proxy = ChannelProxy))
	def void ping(String name) {
		test.hello(name).then[
			println('HELLO-OK: ' + it)
		]
		
		val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
		channel.request(reqInfo).then([ pipe |
			println('CHANNEL-REQ-OK')
			
			val testFile = './downloads/test.txt'
			val bigFile = './downloads/big_test_file'
			
			pipe.buffer as SendBuffer => [ sender |
				sender.onError[ println('ERROR: ' + it) ]
				sender.sendFile(testFile).then([
					println('SENT ' + testFile)
					sender.sendFile(bigFile).then[
						println('SENT ' + bigFile)
						pipe.close
					]
				],[
					println('NOT-SENT ' + testFile)
					sender.sendFile(bigFile).then[
						println('SENT ' + bigFile)
						pipe.close
					]
				])
			]
		], [ println('CHANNEL-REQ-ERROR: ' + it) ])
	}
}