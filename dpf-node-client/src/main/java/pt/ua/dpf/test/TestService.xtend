package pt.ua.dpf.test

import rt.plugin.service.an.Service
import rt.plugin.service.an.Public
import pt.ua.dpf.services.TestInterface

@Service(TestInterface)
class TestService {
	
	@Public
	def String hello(String name) {
		return 'Hello from ' + name
	}
}