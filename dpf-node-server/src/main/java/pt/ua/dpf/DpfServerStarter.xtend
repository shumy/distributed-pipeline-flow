package pt.ua.dpf

import io.vertx.core.AbstractVerticle
import io.vertx.core.Vertx
import pt.ua.dpf.dicoogle.DicoogleClient
import pt.ua.dpf.srv.ServicePointService
import pt.ua.dpf.srv.TransferService
import rt.plugin.service.WebMethod
import rt.vertx.server.DefaultVertxServer
import rt.vertx.server.service.DescriptorService
import rt.vertx.server.service.FileUploaderService
import rt.vertx.server.service.RouterService
import rt.vertx.server.service.SubscriberService
import rt.vertx.server.service.WebFileService
import rt.vertx.server.intercept.JwtAuthInterceptor

//import static io.vertx.core.Vertx.*
//import io.vertx.spi.cluster.hazelcast.HazelcastClusterManager
//import io.vertx.core.VertxOptions

class DpfServerStarter extends AbstractVerticle {
	def static void main(String[] args) {
		var port = 9090
		
		if(args.length > 0) {
			port = Integer.parseInt(args.get(0))
		}
		
		val node = new DpfServerStarter(port)
		Vertx.vertx.deployVerticle(node)
		
		/*
		val options = new VertxOptions => [
			clusterManager = new HazelcastClusterManager
		]
		
		factory.clusteredVertx(options)[
			if (succeeded) {
				result.deployVerticle(node)
			} else {
				System.exit(-1)
			}
		]
		*/
	}
	
	val int port
	
	new(int port) {
		this.port = port
	}
	
	override def start() {
		val server = new DefaultVertxServer(vertx, '/clt', '')
		val dicoogleClient = new DicoogleClient(vertx, 'localhost', 8080)
		
		//services...
		val subscriverSrv = SubscriberService.create
		val servicePointSrv = ServicePointService.create
		val transfersSrv = TransferService.B => [ publisher = server.mb dicoogle = dicoogleClient srvPoint = servicePointSrv ]
		
		/*server.mb => [
			addObserver('srvPointObserver', ServicePointObserver.B => [ publisher = server.mb ])
		]*/
		
		server.pipeline => [
			addInterceptor(new JwtAuthInterceptor)
			
			addService('dpf-ui', WebFileService.B => [ folder = '../dpf-ui' ])
			addService('api-ui', WebFileService.B => [ folder = '/api' root = '/api' resource = true ])
			
			addService('subscriber', subscriverSrv)
			addService('service-point', servicePointSrv)
			addService('transfers', transfersSrv)
			
			failHandler = [ println('PIPELINE-FAIL: ' + message) ]
		]
		
		server => [
			webRouter => [
				headersMap = #{ 'Cookie' -> 'cookie' }
				
				vrtxService('/file-upload', 'dpf-uploader', FileUploaderService.B => [ folder = './downloads' ])
				
				route(WebMethod.GET, '/*', 'dpf-ui', 'file', #['ctx.path'])
				route(WebMethod.GET, '/api/*', 'api-ui', 'file', #['ctx.path'])
				route(WebMethod.GET, '/api/routes', 'routes' -> 'routes')
				route(WebMethod.GET, '/api/specs', 'specs' -> 'specs')
				route(WebMethod.GET, '/api/specs/:name', 'specs' -> 'srvSpec')
				
				/*
				get('/ping/:name', 'ping' -> 'helloPing')
				get('/ping/:first/name/:second/:age', 'ping' -> 'hello2Ping')
				post('/ping', 'ping' -> 'hello3Ping')
				*/
			]
			
			wsRouter => [
				headersMap = #{ 'client' -> 'client' }
				
				onOpen[ println('RESOURCE-OPEN: ' + client) ]
				
				onClose[
					println('RESOURCE-CLOSE: ' + it)
					servicePointSrv.destroy(it)
				]
			]
		]
		
		//should only execute after pipeline configuration...
		server.pipeline.addService('specs', DescriptorService.B => [
			pipeline = server.pipeline
			autoDetect = true
		])
		
		server.pipeline.addService('routes', RouterService.B => [
			router = server.webRouter
		])
		
		server.listen(port)
		println('''DPF-SERVER available at port: «port»''')
	}
}