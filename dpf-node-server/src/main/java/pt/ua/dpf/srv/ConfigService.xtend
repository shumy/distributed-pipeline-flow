package pt.ua.dpf.srv

import rt.data.Data
import rt.plugin.service.an.Service
import java.util.Map
import rt.plugin.service.an.Public

@Data
@Service
class ConfigService {
	val Map<String, Object> configs
	
	@Public
	def Map<String, Object> configs() { return configs }
}