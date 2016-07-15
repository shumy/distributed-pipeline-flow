package pt.ua.dpf

import io.vertx.core.AbstractVerticle
import io.vertx.core.Vertx
import pt.ua.dpf.test.PingService
import rt.pipeline.promise.AsyncUtils
import rt.vertx.server.DefaultVertxServer
import rt.vertx.server.VertxAsyncUtils
import rt.vertx.server.web.service.FileUploaderService
import rt.vertx.server.web.service.WebFileService
import pt.ua.dpf.dicoogle.DicoogleClient
import pt.ua.dpf.proxy.ServicePointProxy
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.vertx.server.ChannelProxy
import rt.vertx.server.web.WebMethod

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
				rest(WebMethod.GET, '/user/:id', 'users', 'get', #{ 'id' -> 0 })
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
								dicoogle.transferTo(allImages, pipe)[ in |
									println('Transform P:' + in.position + ' L:' + in.limit)
									in.position(in.limit)
									return in
								]
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