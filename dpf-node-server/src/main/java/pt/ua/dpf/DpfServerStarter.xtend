package pt.ua.dpf

import io.vertx.core.AbstractVerticle
import io.vertx.core.Vertx
import pt.ua.dpf.test.PingService
import rt.pipeline.promise.AsyncUtils
import rt.vertx.server.DefaultVertxServer
import rt.vertx.server.VertxAsyncUtils
import rt.vertx.server.web.service.FileUploaderService
import rt.vertx.server.web.service.WebFileService
import io.vertx.core.http.HttpClientOptions
import io.vertx.core.http.HttpMethod
import pt.ua.dpf.dicoogle.DicoogleClient

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
		AsyncUtils.set(new VertxAsyncUtils(vertx))
		
		val server = new DefaultVertxServer(vertx, '/clt') => [
			pipeline => [
				addService('http-file-request', new WebFileService('../dpf-ui')) //TODO: source code not protected 
				addService('http-file-uploader', new FileUploaderService('./downloads'))
				addService('ping', new PingService)
				failHandler = [ println('PIPELINE-FAIL: ' + it) ]
			]
			
			webRouter => [
				route('/*', 'http-file-request')
				route('/file-upload', 'http-file-uploader')
			]
			
			wsRouter => [
				onResourceOpen[ println('RESOURCE-OPEN: ' + client) ]
				onResourceClose[ println('RESOURCE-CLOSE: ' + it) ]
			]	
		]
		
		val dicoogle = new DicoogleClient(vertx, 'localhost', 8080)
		dicoogle.query('Modality:OP').then[
			println(numResults)
			println(results)
		]
		
		val sopInstanceUUID = '1.3.6.1.4.1.9590.100.1.2.336693595913510495035179723761217566701'
		dicoogle.download(sopInstanceUUID, './downloads/' + sopInstanceUUID + '.dcm').then[
			println('File transfer ended')
		]
		
		server.listen(port)
		println('''DPF-SERVER available at port: «port»''')
	}
}