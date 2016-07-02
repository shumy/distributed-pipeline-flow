package pt.ua.dpf.test

import rt.plugin.service.an.Service
import rt.plugin.service.an.Public
import pt.ua.dpf.services.PingInterface
import rt.plugin.service.an.Proxy

@Service(PingInterface)
class PingService {
	
	@Public
	@Proxy(name = 'test', proxy = TestProxy)
	def void ping(String name) {
		test.hello(name).then[
			println('HELLO-OK: ' + it)
		]
	}
}