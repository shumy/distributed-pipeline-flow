package pt.ua.dpf.srv

import io.vertx.core.http.HttpServerRequest
import pt.ua.dpf.dicoogle.DicoogleClient
import rt.data.Data
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

@Data
@Service
class DicoogleProxyService {
	val DicoogleClient dicoogle
	
	@Public(notif = true)
	def void dic2png(HttpServerRequest req, String sopInstanceUID) {
		req.endHandler[
			dicoogle.proxyGET('/dic2png?SOPInstanceUID=' + sopInstanceUID, req.response)
		]
	}
	
	@Public(notif = true)
	def void dic2pngThumbnail(HttpServerRequest req, String sopInstanceUID) {
		req.endHandler[
			dicoogle.proxyGET('/dic2png?thumbnail=true&SOPInstanceUID=' + sopInstanceUID, req.response)
		]
	}
	
	@Public(notif = true)
	def void searchDIM(HttpServerRequest req, String query) {
		req.endHandler[
			dicoogle.proxyGET('/searchDIM?query=' + query + '&keyword=true&provider=r-pacs-query', req.response)
		]
	}
	
	@Public(notif = true)
	def void dumpDIM(HttpServerRequest req, String uid) {
		req.endHandler[
			dicoogle.proxyGET('/dump?uid=' + uid, req.response)
		]
	}
}