package pt.ua.dpf.dicoogle

import com.google.gson.Gson
import io.vertx.core.Vertx
import io.vertx.core.file.OpenOptions
import io.vertx.core.http.HttpClient
import io.vertx.core.http.HttpClientOptions
import io.vertx.core.streams.Pump
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.util.LinkedList
import java.util.List
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.zip.Deflater
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import pt.ua.dpf.dicoogle.model.Image
import rt.async.AsyncUtils
import rt.async.observable.Observable
import rt.async.observable.ObservableResult
import rt.async.promise.Promise
import rt.async.promise.PromiseResult
import rt.pipeline.pipe.channel.IPipeChannel
import rt.pipeline.pipe.channel.SendBuffer

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
				bodyHandler[
					val result = toString('UTF-8')
					promise.resolve(gson.fromJson(result, QueryResult))
				]
				
				exceptionHandler[ promise.reject(it) ]
			]
		]
		
		return pResult.promise
	}
	
	def Promise<QueryResult> findPatients(List<String> patientIds) {
		val PromiseResult<QueryResult> pResult = [ promise |
			val qr = new QueryResult
			val nResults = new AtomicInteger(0)
			patientIds.forEach[ pID |
				query('PatientID:' + pID).then[
					qr.merge(it)
					if (nResults.incrementAndGet == patientIds.size)
						promise.resolve(qr)
				].error[ promise.reject(it) ]
			]
		]
		
		return pResult.promise
	}
	
	def Promise<Void> download(String sopInstanceUID, String filePath) {
		val PromiseResult<Void> pResult = [ promise |
			httpClient.getNow('/legacy/file?uid=' + sopInstanceUID)[ resp |
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
	
	def Observable<String> download(List<Image> images, String zipFilePath) {
		val ObservableResult<String> pResult = [ sub |
			var FileOutputStream fos = null 
			try {
				fos = new FileOutputStream(zipFilePath)
			} catch(Exception ex) {
				sub.error(ex)
				sub.complete
				return
			}
			
			val zipOut = new ZipOutputStream(fos)
			zipOut.level = Deflater.DEFAULT_COMPRESSION
			
			val ready = new AtomicBoolean(true)
			val processed = new AtomicInteger(0)
			images.forEach[ image |
				AsyncUtils.waitUntil([ready.get],[
					ready.set = false
					httpClient.getNow('/legacy/file?uid=' + image.sopInstanceUID)[ resp |
						if (resp.statusCode != 200) {
							sub.error(new TransferException(image.sopInstanceUID, resp.statusMessage))
							return
						}
						
						println('Ready: ' + image.sopInstanceUID)
						resp.bodyHandler[
							zipOut.putNextEntry(new ZipEntry(image.sopInstanceUID + '.dcm'))
								zipOut.write(byteBuf.array)
							zipOut.closeEntry
							
							println('Zipped: ' + image.sopInstanceUID)
							sub.next(image.sopInstanceUID)
							if (processed.incrementAndGet == images.size) {
								zipOut => [ flush close ]
								sub.complete
							}
							
							ready.set = true
						]
					]
				])
			]
		]
		
		return pResult.observe
	}
	
	def Observable<String> transferTo(List<Image> images, IPipeChannel writePipe) {
		return transferTo(images, writePipe, null)
	}
	
	def Observable<String> transferTo(List<Image> images, IPipeChannel writePipe, (ByteBuffer) => ByteBuffer transform) {
		val ObservableResult<String> pResult = [ sub |
			val sendBuffer = writePipe.buffer as SendBuffer
			
			val ready = new AtomicBoolean(true)
			val transferred = new AtomicInteger(0)
			images.forEach[ image |
				AsyncUtils.waitUntil([ready.get],[
					ready.set = false
					httpClient.getNow('/legacy/file?uid=' + image.sopInstanceUID)[ resp |
						if (resp.statusCode != 200) {
							sub.error(new TransferException(image.sopInstanceUID, resp.statusMessage))
							return
						}
						
						val bufferCache = new LinkedList<ByteBuffer>
						val filePath = './downloads/' + image.sopInstanceUID + '.dcm'
						
						println('Ready: ' + image.sopInstanceUID)
						resp.pause
						
						sendBuffer.begin(filePath)[
							onEnd[
								println('End transfer: ' + image.sopInstanceUID)
								sub.next(image.sopInstanceUID)
								if (transferred.incrementAndGet == images.size)
									sub.complete
								
								ready.set = true
							]
							
							onError[
								println('Error transfer: ' + image.sopInstanceUID)
								sub.error(new TransferException(image.sopInstanceUID,it))
								ready.set = true
							]
							
							println('Begin transfer: ' + image.sopInstanceUID)
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
									
									sendBuffer.sendSliced(transformedBuffer)[ sendBuffer.end ]
								} catch(Exception ex) {
									sendBuffer.error('Transformation error: ' + ex.message)
								}
							} else {
								sendBuffer.end
							}
						]
					]	
				])
			]	
		]
		
		return pResult.observe
	}
}

class TransferException extends RuntimeException {
	public val String sopUID
	
	new(String sopUID, String message) {
		super(message)
		this.sopUID = sopUID
	}
}