package pt.ieeta.dpf

import io.vertx.spi.cluster.hazelcast.HazelcastClusterManager
import io.vertx.core.VertxOptions
import io.vertx.core.AbstractVerticle
import io.vertx.core.http.HttpServerOptions

import static io.vertx.core.Vertx.*
import rt.vertx.server.VertxRouter
import rt.pipeline.pipe.Pipeline
import pt.ieeta.dpf.test.PingService
import rt.pipeline.DefaultMessageBus

class DpfServerStarter extends AbstractVerticle {
	def static void main(String[] args) {
		var port = 9090
		
		if(args.length > 0) {
			port = Integer.parseInt(args.get(0))
		}
		
		val node = new DpfServerStarter(port)
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
	}
	
	val int port
	
	new(int port) {
		this.port = port
	}
	
	override def start() {
		val server = vertx.createHttpServer(new HttpServerOptions => [
			tcpKeepAlive = true
		])
		
		val bus = new DefaultMessageBus
		
		val pipeline = new Pipeline(bus) => [
			bootServices
			failHandler = [ println('PIPELINE-FAIL: ' + it) ]
		]
		
		val router = new VertxRouter(server) => [
			route('/ws', pipeline)
		]
		
		router.listen(port)
		println('''Node («port»)''')
	}
	
	def void bootServices(Pipeline pipeline) {
		pipeline.addService(new PingService)
	}
}