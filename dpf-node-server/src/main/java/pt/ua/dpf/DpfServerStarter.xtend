package pt.ua.dpf

import io.vertx.core.AbstractVerticle
import io.vertx.core.Vertx
import pt.ua.dpf.dicoogle.Anonymizer
import pt.ua.dpf.dicoogle.DicoogleClient
import pt.ua.dpf.proxy.ServicePointProxy
import pt.ua.dpf.test.PingService
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.vertx.server.ChannelProxy
import rt.vertx.server.DefaultVertxServer
import rt.vertx.server.web.service.FileUploaderService
import rt.vertx.server.web.service.WebFileService

import static extension rt.vertx.server.web.service.FileUploaderService.*
import static extension rt.vertx.server.web.service.WebFileService.*
import rt.vertx.server.web.service.SpecsService
import rt.plugin.service.descriptor.IDescriptor

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
		val server = new DefaultVertxServer(vertx, '/clt', '') => [
			pipeline => [
				addService('ping', new PingService)
				failHandler = [ println('PIPELINE-FAIL: ' + message) ]
			]
		]
		
		//should only execute after pipeline configuration...
		server.pipeline.addService('specs', SpecsService.B => [
			pipeline = server.pipeline
			autoDetect = true
		])
		
		server => [
			webRouter => [
				vrtxRoute('/*', WebFileService => [ folder = '../dpf-ui' ]) //TODO: source code not protected 
				vrtxRoute('/file-upload', FileUploaderService => [ folder = './downloads' ])
				
				get('/specs', 'specs' -> 'specs')
				get('/specs/:name', 'specs' -> 'srvSpec')
				
				get('/ping/:name', 'ping' -> 'helloPing')
				get('/ping/:first/name/:second/:age', 'ping' -> 'hello2Ping')
				post('/ping', 'ping' -> 'hello3Ping')
			]
			
			wsRouter => [
				onOpen[
					println('RESOURCE-OPEN: ' + it)
					
					val channelProxy = createProxy('channel', ChannelProxy)
					val srvPointProxy = createProxy('service-point', ServicePointProxy)
					
					srvPointProxy.info.then[ srvPoint |
						println('ServicePoint connected: ' + srvPoint.address)
						//println('Nodes-Type: ' + nodes.class)
						
						val dicoogle = new DicoogleClient(vertx, 'localhost', 8080)
						dicoogle.query('Modality:OP').then[
							
							//transfer files to the ServicePoint
							val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
							channelProxy.request(reqInfo).then([ pipe |
								println('CHANNEL-REQ-OK')
								dicoogle.transferTo(allImages, pipe, Anonymizer.transform)
							], [ println('CHANNEL-REQ-ERROR: ' + it) ])
						]
					]
					
				]
				onClose[ println('RESOURCE-CLOSE: ' + it) ]
			]
		]
		
		server.listen(port)
		println('''DPF-SERVER available at port: «port»''')
	}
}