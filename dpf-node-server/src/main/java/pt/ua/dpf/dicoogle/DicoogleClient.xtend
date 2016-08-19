package pt.ua.dpf.dicoogle

import com.google.gson.Gson
import io.vertx.core.Vertx
import io.vertx.core.file.OpenOptions
import io.vertx.core.http.HttpClient
import io.vertx.core.http.HttpClientOptions
import io.vertx.core.streams.Pump
import java.nio.ByteBuffer
import java.util.LinkedList
import java.util.List
import pt.ua.dpf.dicoogle.model.Image
import rt.async.promise.Promise
import rt.async.promise.PromiseResult
import rt.pipeline.pipe.channel.IPipeChannel
import rt.pipeline.pipe.channel.SendBuffer
import java.util.concurrent.atomic.AtomicInteger

class DicoogleClient {
	val Gson gson = new Gson
	
	val Vertx vertx
	val HttpClient httpClient
	
	new(Vertx vertx, String host, int port) {
		this.vertx = vertx
		
		val httpOptions = new HttpClientOptions => [
			defaultHost = 'localhost'
			defaultPort = 8080
		]
		
		httpClient = vertx.createHttpClient(httpOptions)
	}
	
	def Promise<QueryResult> query(String query) {
		val PromiseResult<QueryResult> pResult = [ promise |
			httpClient.getNow('/searchDIM?query=' + query + '&keyword=true')[
				println('query status: ' + statusCode)
				bodyHandler[
					val result = toString('UTF-8')
					promise.resolve(gson.fromJson(result, QueryResult))
				]
				
				exceptionHandler[ promise.reject(it) ]
			]
		]
		
		return pResult.promise
	}
	
	def Promise<Void> download(String sopInstanceUID, String filePath) {
		val PromiseResult<Void> pResult = [ promise |
			httpClient.getNow('/legacy/file?uid=' + sopInstanceUID)[ resp |
				println('download status: ' + resp.statusCode)
				resp.pause
				
				val options = new OpenOptions => [ create = true write = true ]
				vertx.fileSystem.open(filePath, options) [
					if (failed) {
						promise.reject(cause)
					} else {
						val file = result
						val pump = Pump.pump(resp, file)
						resp.endHandler[
							file.close
							promise.resolve(null)
						]
						
						pump.start
						resp.resume
					}
				]
			]	
		]
		
		return pResult.promise
	}
	
	def Promise<Integer> transferTo(List<Image> images, IPipeChannel writePipe) {
		return transferTo(images, writePipe, null)
	}
	
	def Promise<Integer> transferTo(List<Image> images, IPipeChannel writePipe, (ByteBuffer) => ByteBuffer transform) {
		val PromiseResult<Integer> pResult = [ promise |
			val sendBuffer = writePipe.buffer as SendBuffer
			
			val tranferred = new AtomicInteger(0)
			images.forEach[ image |
				httpClient.getNow('/legacy/file?uid=' + image.sopInstanceUID)[ resp |
					println('TransferTo status: ' + resp.statusCode)
					if (resp.statusCode != 200) {
						promise.reject(new RuntimeException(resp.statusMessage))
						return
					}
					
					val bufferCache = new LinkedList<ByteBuffer>
					val filePath = './downloads/' + image.sopInstanceUID + '.dcm'
					
					resp.pause
					sendBuffer.begin(filePath)[
						println('Begin transfer: ' + filePath)
						resp.resume
					]
					
					resp.handler[
						val buffer = byteBuf.nioBuffer
						if (transform != null)
							bufferCache.add(buffer)
						else
							sendBuffer << buffer
					]
					
					resp.endHandler[
						if (transform != null) {
							val size = bufferCache.fold(0)[ r, next | r + next.limit ]
							
							//TODO: process in parallel task?
							val endBuffer = ByteBuffer.allocate(size)
							bufferCache.forEach[ endBuffer.put(it) ]
							endBuffer.flip
							
							try {
								val transformedBuffer = transform.apply(endBuffer)
								transformedBuffer.flip
								
								sendBuffer.sendSliced(transformedBuffer) [
									println('End transfer: ' + filePath)
									sendBuffer.end
									promise.resolve(tranferred.incrementAndGet)
								]
							} catch(Exception ex) {
								sendBuffer.error('Transformation error: ' + ex.message)
								promise.reject(ex)
							}
						} else {
							println('End transfer: ' + filePath)
							sendBuffer.end
							promise.resolve(tranferred.incrementAndGet)
						}
					]
				]
			]	
		]
		
		return pResult.promise
	}
}