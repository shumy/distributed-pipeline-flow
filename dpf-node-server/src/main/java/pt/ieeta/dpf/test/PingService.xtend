package pt.ieeta.dpf.test

import rt.plugin.service.Service
import rt.plugin.service.Public
import rt.pipeline.IMessageBus.Message

@Service('ping')
class PingService {
		
	@Public
	def void ping() {
		ctx.send(new Message => [id=1L cmd='hello' client='server' path='srv:test' args=#['Alex']])
	}
}