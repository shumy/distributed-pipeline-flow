package pt.ua.dpf

import io.vertx.core.AbstractVerticle
import pt.ua.dpf.test.PingService
import io.vertx.core.Vertx
import rt.vertx.server.web.FileUploaderService
import rt.vertx.server.web.WebFileService
import rt.vertx.server.DefaultVertxServer

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
		new DefaultVertxServer(vertx, '/clt') => [
			pipeline => [
				addService('http-file-request', new WebFileService('../dpf-ui')) //TODO: source code not protected 
				addService('http-file-uploader', new FileUploaderService('./downloads'))
				addService('ping', new PingService)
				failHandler = [ println('PIPELINE-FAIL: ' + it) ]
			]
			
			httpRouter => [
				route('/*', 'http-file-request')
				route('/file-upload', 'http-file-uploader')
			]
			
			listen(port)
		]
		
		println('''DPF-SERVER available at port: «port»''')
	}
}