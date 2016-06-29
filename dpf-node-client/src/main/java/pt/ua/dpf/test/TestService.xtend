package pt.ua.dpf.test

import rt.plugin.service.Service
import rt.plugin.service.Public
import pt.ua.dpf.services.TestInterface

@Service('test')
class TestService implements TestInterface {
	
	@Public
	override hello(String name) {
		println('HELLO ' + name)
	}
}