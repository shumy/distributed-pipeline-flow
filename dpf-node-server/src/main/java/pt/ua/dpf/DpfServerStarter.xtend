package pt.ua.dpf

import io.vertx.core.AbstractVerticle
import io.vertx.core.Vertx
import java.io.FileInputStream
import java.util.Properties
import org.eclipse.xtend.lib.annotations.FinalFieldsConstructor
import pt.ua.dpf.dicoogle.DicoogleClient
import pt.ua.dpf.srv.AnnotationService
import pt.ua.dpf.srv.DatasetService
import pt.ua.dpf.srv.DicoogleProxyService
import pt.ua.dpf.srv.IndexService
import pt.ua.dpf.srv.PropertyMapService
import pt.ua.dpf.srv.ServicePointService
import pt.ua.dpf.srv.TransferService
import pt.ua.ieeta.rpacs.utils.DefaultConfig
import rt.plugin.service.WebMethod
import rt.utils.interceptor.AccessControlInterceptor
import rt.utils.interceptor.JwtAuthInterceptor
import rt.utils.service.DescriptorService
import rt.utils.service.RepositoryService
import rt.utils.service.RouterService
import rt.utils.service.SubscriberService
import rt.utils.service.WebFileService
import rt.vertx.server.DefaultVertxServer
import rt.vertx.server.service.FolderManagerService

//import static io.vertx.core.Vertx.*
//import io.vertx.spi.cluster.hazelcast.HazelcastClusterManager
//import io.vertx.core.VertxOptions

@FinalFieldsConstructor
class DpfServerStarter extends AbstractVerticle {
	def static void main(String[] args) {
		println(args.length)
		val isProd = if (args.length > 0 && args.get(0) == 'prod') true else false
		
		val node = new DpfServerStarter(isProd)
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
	
	val boolean isProd
	
	override def start() {
		//CONFIGS BEGIN------------------------------------------------------------------------------------
		val props = new Properties => [
			if (isProd) {
				println('''Loading config: config.prod.properties''')
				load(new FileInputStream('config.prod.properties'))
			} else {
				println('''Loading config: config.properties''')
				load(new FileInputStream('config.properties'))
			}
		]
		
		val propDicoogleHost = props.getProperty('dicoogle.host')
		val propDicooglePort = Integer.parseInt(props.getProperty('dicoogle.port'))
		val propDicoogleQueryProvider = props.getProperty('dicoogle.queryProvider')
		
		val propOicJwksUrl = props.getProperty('oic.jwksUrl')
		val propOicIssuer = props.getProperty('oic.issuer')
		val propOicAudience = props.getProperty('oic.audience')
		
		val propPort = Integer.parseInt(props.getProperty('server.port'))
		val propPrefixURI = props.getProperty('server.prefixURI')
		val wsBaseRoute = props.getProperty('server.wsBaseRoute')
		val webBaseRoute = props.getProperty('server.webBaseRoute')
		//CONFIGS END------------------------------------------------------------------------------------
		
		val server = new DefaultVertxServer(vertx, wsBaseRoute, webBaseRoute)
		val dicoogleClient = new DicoogleClient(vertx, propDicoogleHost, propDicooglePort)
		
		//config database and docstore
		DefaultConfig.initServerFromProperties
		
		//interceptors
		val accessControl = AccessControlInterceptor.create
		val jwtAuth = JwtAuthInterceptor.B => [
			jwksUrl = propOicJwksUrl
			issuer = propOicIssuer
			audience = propOicAudience
		]
		
		//services...
		val dpfUiSrv = WebFileService.B => [
				folder = '../dpf-ui/dist'
				replace = #{
					'/home' 		-> '/',
					'/search' 		-> '/',
					'/upload' 		-> '/',
					'/annotate' 	-> '/',
					'/viewer' 		-> '/',
					'/dataset' 		-> '/',
					'/profile' 		-> '/',
					'/realm' 		-> '/'
				}
			]
		
		val apiUiSrv = WebFileService.B => [
				resource = true
				folder = '/api'
				replace = #{
					'/api' -> '/'
				}
			]
		
		val subsSrv = SubscriberService.create
		val reposSrv = RepositoryService.B => [ repos = #[ 'srv-points' ] ]
		val servicePointSrv = ServicePointService.B => [ repo = reposSrv.getRepo('srv-points') ]
		
		val indexService = IndexService.B => [ folder = './downloads' isHomeManager = true ]
		indexService => [
			indexer = dicoogleClient.indexer //delegate to dicoogle indexer
			onFileIndexed = [ delete ]
		]
		
		val folderManagerSrv = FolderManagerService.B => [ folder = './downloads' isHomeManager = true ]
		val transfersSrv = TransferService.B => [ folder = './downloads' dicoogle = dicoogleClient srvPoint = servicePointSrv ]
		val dicoogleProxySrv = DicoogleProxyService.B => [ dicoogle = dicoogleClient queryProvider = propDicoogleQueryProvider ]
		
		val annoSrv = AnnotationService.create
		val dsSrv = DatasetService.B => [ imagePrefixURI = propPrefixURI ]
		
		server.pipeline => [
			addInterceptor(jwtAuth)
			addInterceptor(accessControl)
			
			addService('properties', PropertyMapService.create)
			
			addService('dpf-ui', dpfUiSrv)
			addService('api-ui', apiUiSrv)
			
			addService('subscriber', subsSrv)
			addService('repository', reposSrv)
			addService('service-point', servicePointSrv)
			
			addService('indexer', indexService, #{ 'all' -> '/srv-home' })
			addService('folder-manager', folderManagerSrv, #{ 'all' -> '/srv-home' })
			addService('transfers', transfersSrv, #{ 'all' -> '/srv-transfer' })
			addService('d-proxy', dicoogleProxySrv, #{ 'all' -> '/srv-dicoogle' })
			
			//model services
			addService('anno', annoSrv, #{ 'all' -> '/srv-annotator' })
			addService('ds', dsSrv, #{ 'all' -> 'all' })
			
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
				get('/proxy/searchDIM', 'd-proxy', 'searchDIM', #['ctx.request'])
				get('/proxy/dumpDIM/:uid', 'd-proxy', 'dumpDIM', #['ctx.request', 'uid'])
				
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
		
		server.listen(propPort)
		println('''SCREEN-DR server available at port: «propPort»''')
	}
}