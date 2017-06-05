package pt.ua.dpf.srv

import java.util.List
import rt.data.Data
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import pt.ua.ieeta.rpacs.model.ext.PropertyMap

@Data
@Service
class PropertyMapService {
	
	@Public(worker = true)
	def List<String> allOfKey(String key) {
		return PropertyMap.allOfKey(key).map[value]
	}
}