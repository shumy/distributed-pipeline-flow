package pt.ua.dpf.srv

import java.util.HashMap
import java.util.List
import pt.ua.dpf.services.ServicePointInterface
import pt.ua.dpf.services.SrvPoint
import rt.data.Data
import rt.data.Repository
import rt.pipeline.IResource
import rt.plugin.service.an.Context
import rt.plugin.service.an.Proxy
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.vertx.server.ChannelProxy

@Service(ServicePointInterface)
@Data(metadata = false)
class ServicePointService {
	transient val srvPointChannels = new HashMap<String, ChannelProxy>
	
	val Repository<SrvPoint> repo
	
	@Public
	def List<SrvPoint> srvPoints() {
		return repo.list
	}
	
	@Public
	@Proxy(name = 'channel', type = ChannelProxy)
	@Context(name = 'resource', type = IResource)
	def void create(SrvPoint srvPoint) {
		val uuid = resource.client
		
		repo.add(uuid, srvPoint)
		srvPointChannels.put(uuid, channel)
	}
	
	def void delete(String srvPointId) {
		val sp = repo.remove(srvPointId)
		if (sp != null) {
			srvPointChannels.remove(srvPointId)
		}
	}
	
	def ChannelProxy getSrvPointChannel(String srvPointId) {
		return srvPointChannels.get(srvPointId)
	}
}