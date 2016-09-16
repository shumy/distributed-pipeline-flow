package pt.ua.dpf

import io.vertx.core.AbstractVerticle
import io.vertx.core.Vertx
import pt.ua.dpf.dicoogle.DicoogleClient
import pt.ua.dpf.srv.ServicePointService
import pt.ua.dpf.srv.TransferService
import rt.plugin.service.WebMethod
import rt.vertx.server.DefaultVertxServer
import rt.vertx.server.intercept.JwtAuthInterceptor
import rt.vertx.server.service.DescriptorService
import rt.vertx.server.service.FolderManagerService
import rt.vertx.server.service.RepositoryService
import rt.vertx.server.service.RouterService
import rt.vertx.server.service.SubscriberService
import rt.vertx.server.service.UsersService
import rt.vertx.server.service.WebFileService

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
		
		//interceptors
		val jwtAuth = JwtAuthInterceptor.B => [
			jwksUrl = 'http://localhost:8081/auth/realms/dev/protocol/openid-connect/certs'
			issuer = 'http://localhost:8081/auth/realms/dev'
			audience = 'screen-dr'
		]
		
		//services...
		val usersSrv = UsersService.create
		val subsSrv = SubscriberService.create
		val reposSrv = RepositoryService.B => [ repos = #[ 'srv-points' ] ]
		
		val folderManagerSrv = FolderManagerService.B => [ folder = './downloads' ]
		val servicePointSrv = ServicePointService.B => [ repo = reposSrv.getRepo('srv-points') ]
		val transfersSrv = TransferService.B => [ dicoogle = dicoogleClient srvPoint = servicePointSrv ]
		
		
		server.pipeline => [
			addInterceptor(jwtAuth)
			
			addService('dpf-ui', WebFileService.B => [ folder = '../dpf-ui' ])
			addService('api-ui', WebFileService.B => [ folder = '/api' root = '/api' resource = true ])
			
			addService('users', usersSrv)
			addService('subscriber', subsSrv)
			addService('repository', reposSrv)
			
			addService('folder-manager', folderManagerSrv, #{ 'list' -> 'all', 'download' -> 'all', 'upload' -> 'admin' })
			addService('service-point', servicePointSrv)
			addService('transfers', transfersSrv, #{ 'all' -> '/srv-transfer' })
			
			failHandler = [ println('PIPELINE-FAIL: ' + message) ]
		]
		
		server => [
			webRouter => [
				headersProcessor = [ reqHeaders, ctxHeaders |
					ctxHeaders => [
						val cookie = reqHeaders.get('Cookie')
						if (cookie !== null)
							add('cookie', cookie)
						
						val auth = reqHeaders.get('Authorization')
						if(auth !== null) {
							add('auth', 'jwt')
							add('token', auth.split(' ').get(1))
						}
					]
				]
				
				route(WebMethod.GET, '/*', 'dpf-ui', 'file', #['ctx.path'])
				route(WebMethod.GET, '/api/*', 'api-ui', 'file', #['ctx.path'])
				route(WebMethod.GET, '/api/routes', 'routes' -> 'routes')
				route(WebMethod.GET, '/api/specs', 'specs' -> 'specs')
				route(WebMethod.GET, '/api/specs/:name', 'specs' -> 'srvSpec')
				
				get('/file-list/:path', 'folder-manager' -> 'list')
				get('/file-download/:filename', 'folder-manager', 'download', #['ctx.request', 'filename'])
				post('/file-upload', 'folder-manager', 'upload', #['ctx.request'])
				
				/*
				get('/ping/:name', 'ping' -> 'helloPing')
				get('/ping/:first/name/:second/:age', 'ping' -> 'hello2Ping')
				post('/ping', 'ping' -> 'hello3Ping')
				*/
			]
			
			wsRouter => [
				onOpen[
					println('RESOURCE-OPEN: ' + client)
				]
				
				onClose[
					println('RESOURCE-CLOSE: ' + it)
					servicePointSrv.delete(it)
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