package pt.ua.dpf

import io.vertx.core.AbstractVerticle
import io.vertx.core.http.HttpServerOptions
import rt.pipeline.pipe.Pipeline
import pt.ua.dpf.test.PingService
import io.vertx.core.Vertx
import rt.vertx.server.WsRouter
import rt.vertx.server.HttpRouter
import rt.vertx.server.web.FileUploaderService
import rt.vertx.server.web.WebFileService

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
		val server = vertx.createHttpServer(new HttpServerOptions => [
			tcpKeepAlive = true
		])
		
		val srvWebFile = new WebFileService('../dpf-ui') //TODO: source code not protected 
		val srvUploader = new FileUploaderService('./downloads')
		val srvPing = new PingService
				
		val pipeline = new Pipeline => [
			addService('http-file-request', srvWebFile)
			addService('http-file-uploader', srvUploader)
			addService('ping', srvPing)
			failHandler = [ println('PIPELINE-FAIL: ' + it) ]
		]
		
		//config WS router
		new WsRouter('/clt', server, pipeline)
		
		//config HTTP router
		new HttpRouter(server, pipeline) => [
			route('/*', 'http-file-request')
			route('/file-upload', 'http-file-uploader')
		]
		
		server.listen(port)
		println('''DPF-SERVER available at port: «port»''')
	}
}