package pt.ua.dpf.test

import rt.plugin.service.Service
import rt.plugin.service.Public
import pt.ua.dpf.services.PingInterface

@Service('ping')
class PingService implements PingInterface {
	
	@Public
	override ping(String name) {
		//ctx.send(new Message => [id=1L cmd='hello' clt='server' path='srv:test' args=#[name]])
		val proxy = client.create('test', TestProxy)
		proxy.hello(name).then[
			println('HELLO-OK: ' + it)
		]
	}
}