package pt.ieeta.dpf.test

import rt.plugin.service.Service
import rt.plugin.service.Public

@Service('test')
class TestService {
	
	@Public
	def void hello(String name) {
		println('HELLO ' + name)
	}
}