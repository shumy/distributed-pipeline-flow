package pt.ua.dpf.srv

import java.util.HashMap
import java.util.List
import pt.ua.dpf.services.ServicePointInterface
import pt.ua.dpf.services.SrvPoint
import rt.data.Data
import rt.plugin.service.an.Proxy
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.vertx.server.ChannelProxy

@Service(ServicePointInterface)
@Data(metadata = false)
class ServicePointService {
	transient val srvPoints = new HashMap<String, SrvPoint>
	transient val srvPointChannels = new HashMap<String, ChannelProxy>
	
	@Public
	@Proxy(name = 'channel', type = ChannelProxy)
	def void create(SrvPoint srvPoint) {
		println('CREATE-SRV-POINT: ' + srvPoint.id)
		srvPoints.put(srvPoint.id, srvPoint)
		srvPointChannels.put(srvPoint.id, channel)
	}
	
	@Public
	def List<SrvPoint> srvPoints() {
		return srvPoints.values.toList
	}
	
	def void destroy(String srvPointId) {
		println('DESTROY-SRV-POINT: ' + srvPointId)
		srvPoints.remove(srvPointId)
		srvPointChannels.remove(srvPointId)
	}
	
	def ChannelProxy getSrvPointChannel(String srvPointId) {
		return srvPointChannels.get(srvPointId)
	}
}