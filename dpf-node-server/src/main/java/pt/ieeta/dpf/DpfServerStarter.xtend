package pt.ieeta.dpf

import io.vertx.spi.cluster.hazelcast.HazelcastClusterManager
import io.vertx.core.VertxOptions
import io.vertx.core.AbstractVerticle
import io.vertx.core.http.HttpServerOptions

import static io.vertx.core.Vertx.*
import rt.pipeline.Registry
import rt.vertx.server.VertxRouter
import rt.vertx.server.MessageConverter
import rt.pipeline.pipe.Pipeline
import pt.ieeta.dpf.test.PingService
import rt.pipeline.DefaultMessageBus

class DpfServerStarter extends AbstractVerticle {
	def static void main(String[] args) {
		var domain = args.get(0)
		var port = 9090
		
		if(args.length > 1) {
			port = Integer.parseInt(args.get(1))
		}
		
		val node = new DpfServerStarter(domain, port)
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
	
	val String domain
	val int port
	
	new(String domain, int port) {
		this.domain = domain
		this.port = port
	}
	
	override def start() {
		val converter = new MessageConverter
		
		val server = vertx.createHttpServer(new HttpServerOptions => [
			tcpKeepAlive = true
		])
		
		val registry = new Registry(domain, new DefaultMessageBus)
		val pipeline = registry.createPipeline => [
			bootServices
			failHandler = [ println('PIPELINE-FAIL: ' + it) ]
		]
		
		val router = new VertxRouter(server, converter) => [
			route('/ws', pipeline)
		]
		
		router.listen(port)
		println('''Node («domain», «port»)''')
	}
	
	def void bootServices(Pipeline pipeline) {
		pipeline.addService(new PingService)
	}
}