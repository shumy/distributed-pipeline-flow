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
	val String queryProvider
	
	@Public(notif = true)
	def void dic2png(HttpServerRequest req, String sopInstanceUID) {
		req.endHandler[
			dicoogle.proxyGET('/dic2png?SOPInstanceUID=' + sopInstanceUID, req.response, true)
		]
	}
	
	@Public(notif = true)
	def void dic2pngThumbnail(HttpServerRequest req, String sopInstanceUID) {
		req.endHandler[
			dicoogle.proxyGET('/dic2png?thumbnail=true&SOPInstanceUID=' + sopInstanceUID, req.response, true)
		]
	}
	
	@Public(notif = true)
	def void searchDIM(HttpServerRequest req) {
		val query = req.getParam('query')
		println('QUERY-DIM -> ' + query)
		
		val keyword = if (query.contains(":")) "true" else "false"
		req.endHandler[
			val uri = '''/searchDIM?query=«query»&keyword=«keyword»&provider=«queryProvider»'''.toString.replaceAll(" ", "%20")
			dicoogle.proxyGET(uri, req.response, false)
		]
	}
	
	@Public(notif = true)
	def void dumpDIM(HttpServerRequest req, String uid) {
		req.endHandler[
			dicoogle.proxyGET('/dump?uid=' + uid, req.response, false)
		]
	}
}