package pt.ua.dpf

import com.avaje.ebean.EbeanServerFactory
import com.avaje.ebean.config.ServerConfig
import io.vertx.core.AbstractVerticle
import io.vertx.core.Vertx
import pt.ua.dpf.dicoogle.DicoogleClient
import pt.ua.dpf.srv.AnnotationService
import pt.ua.dpf.srv.IndexService
import pt.ua.dpf.srv.ServicePointService
import pt.ua.dpf.srv.TransferService
import pt.ua.ieeta.rpacs.model.Image
import pt.ua.ieeta.rpacs.model.Patient
import pt.ua.ieeta.rpacs.model.Serie
import pt.ua.ieeta.rpacs.model.Study
import pt.ua.ieeta.rpacs.model.ext.Annotation
import pt.ua.ieeta.rpacs.model.ext.Annotator
import pt.ua.ieeta.rpacs.model.ext.Lesion
import rt.plugin.service.WebMethod
import rt.utils.interceptor.JwtAuthInterceptor
import rt.utils.service.DescriptorService
import rt.utils.service.RepositoryService
import rt.utils.service.RouterService
import rt.utils.service.SubscriberService
import rt.utils.service.UsersService
import rt.utils.service.WebFileService
import rt.vertx.server.DefaultVertxServer
import rt.vertx.server.service.FolderManagerService
import pt.ua.dpf.srv.DicoogleProxyService
import rt.utils.interceptor.AccessControlInterceptor

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
		
		//config storage and index
		EbeanServerFactory.create(new ServerConfig => [
			name = 'db'
			defaultServer = true
			
			addClass(Patient)
			addClass(Study)
			addClass(Serie)
			addClass(Image)
			
			addClass(Annotator)
			addClass(Annotation)
			addClass(Lesion)
			
			loadFromProperties
		])
		
		//interceptors
		val accessControl = AccessControlInterceptor.create
		val jwtAuth = JwtAuthInterceptor.B => [
			jwksUrl = 'http://localhost:8081/auth/realms/dev/protocol/openid-connect/certs'
			issuer = 'http://localhost:8081/auth/realms/dev'
			audience = 'screen-dr'
		]
		
		//services...
		val dpfUiSrv = WebFileService.B => [
				folder = '../dpf-ui/dist'
				replace = #{
					'/search' 		-> '/',
					'/upload' 		-> '/',
					'/annotate' 	-> '/'
				}
			]
		
		val apiUiSrv = WebFileService.B => [
				resource = true
				folder = '/api'
				replace = #{
					'/api' -> '/'
				}
			]
		
		val usersSrv = UsersService.create
		val subsSrv = SubscriberService.create
		val reposSrv = RepositoryService.B => [ repos = #[ 'srv-points' ] ]
		
		val indexService = IndexService.B => [ folder = './downloads' isHomeManager = true ]
		indexService => [
			indexer = dicoogleClient.indexer //delegate to dicoogle indexer
			onFileIndexed = [ delete ]
		]
		
		val folderManagerSrv = FolderManagerService.B => [ folder = './downloads' isHomeManager = true ]
		val servicePointSrv = ServicePointService.B => [ repo = reposSrv.getRepo('srv-points') ]
		val transfersSrv = TransferService.B => [ folder = './downloads' dicoogle = dicoogleClient srvPoint = servicePointSrv ]
		val dicoogleProxySrv = DicoogleProxyService.B => [ dicoogle = dicoogleClient ]
		
		val annoSrv = AnnotationService.B => [ prefixURI = 'http://localhost:9090/proxy/dic2png/' ]
		
		server.pipeline => [
			addInterceptor(jwtAuth)
			addInterceptor(accessControl)
			
			addService('dpf-ui', dpfUiSrv)
			addService('api-ui', apiUiSrv)
			
			addService('users', usersSrv)
			addService('subscriber', subsSrv)
			addService('repository', reposSrv)
			
			addService('indexer', indexService, #{ 'all' -> '/srv-home' })
			addService('folder-manager', folderManagerSrv, #{ 'all' -> '/srv-home' })
			addService('service-point', servicePointSrv)
			addService('transfers', transfersSrv, #{ 'all' -> '/srv-transfer' })
			addService('d-proxy', dicoogleProxySrv, #{ 'all' -> '/srv-dicoogle' })
			
			//model services
			addService('anno', annoSrv, #{ 'all' -> '/srv-annotator' })
			
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
				
				get('/users/me', 'users' -> 'me')
				
				get('/file-list/:path', 'folder-manager' -> 'list')
				get('/file-download/:filename', 'folder-manager', 'download', #['ctx.request', 'filename'])
				post('/file-upload', 'folder-manager', 'upload', #['ctx.request'])
				
				get('/proxy/dic2png/:uid', 'd-proxy', 'dic2png', #['ctx.request', 'uid'])
				get('/proxy/dic2pngThumbnail/:uid', 'd-proxy', 'dic2pngThumbnail', #['ctx.request', 'uid'])
				
				get('/non-images', 'anno' -> 'allNonAnnotatedImages')
				get('/read-anno/:id', 'anno' -> 'readAnnotation')
				put('/create-anno', 'anno' -> 'createAnnotation')
				post('/update-anno', 'anno' -> 'updateAnnotation')
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