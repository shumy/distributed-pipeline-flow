package pt.ieeta.dpf.test

import rt.plugin.service.Service
import rt.plugin.service.Public
import rt.pipeline.IMessageBus.Message

@Service('ping')
class PingService {
		
	@Public
	def void ping(String name) {
		ctx.send(new Message => [id=1L cmd='hello' clt='server' path='srv:test' args=#[name]])
	}
}