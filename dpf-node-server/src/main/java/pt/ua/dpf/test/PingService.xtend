package pt.ua.dpf.test

import rt.plugin.service.CtxHeaders
import rt.plugin.service.an.Context
import rt.plugin.service.an.Proxy
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.vertx.server.ChannelProxy

import static extension pt.ua.dpf.test.TestDTO.*

@Service
class PingService {
	
	@Public(worker = true)
	@Proxy(name = 'channel', type = ChannelProxy)
	@Context(name = 'headers', type = CtxHeaders)
	def void ping(String name) {
		println('ping: ' + name)
		/*test.hello(name).then[
			println('HELLO-OK: ' + it)
		]*/
		
		/*
		val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
		channel.request(reqInfo).then([ pipe |
			println('CHANNEL-REQ-OK')
			
			val testFile = './downloads/test.txt'
			val bigFile = './downloads/big_test_file'
			
			pipe.buffer as SendBuffer => [
				onError[ println('ERROR: ' + it) ]
				onEnd[ println('END') ]
				
				sendFile(testFile)[ println('SENT ' + testFile) ]
				sendFile(bigFile)[ println('SENT ' + bigFile) pipe.close ]
			]
		], [ println('CHANNEL-REQ-ERROR: ' + it) ])
		*/
	}
	
	@Public
	@Context(name = 'headers', type = CtxHeaders)
	def TestDTO helloPing(String name) {
		println('helloPing:')
		headers.printAll
		
		TestDTO => [ firstName = name secondName = 'none' age = 35 ]
	}
	
	@Public
	def TestDTO hello2Ping(String first, String second, int inAge) {
		TestDTO => [ firstName = first secondName = second age = inAge ]
	}
	
	@Public
	def TestDTO hello3Ping(TestDTO dto) {
		return dto
	}
}