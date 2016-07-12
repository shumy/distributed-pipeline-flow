package pt.ua.dpf.services

import rt.plugin.service.an.Service
import pt.ua.dpf.model.ServicePoint
import rt.plugin.service.an.Public

@Service(ServicePointInterface)
class ServicePointService {
	val point = new ServicePoint('just-a-point')
	
	@Public
	def ServicePoint info() { return point }
}