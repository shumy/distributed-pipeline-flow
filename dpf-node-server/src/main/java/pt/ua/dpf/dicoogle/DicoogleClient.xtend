package pt.ua.dpf.dicoogle

import com.google.gson.Gson
import io.vertx.core.Vertx
import io.vertx.core.file.OpenOptions
import io.vertx.core.http.HttpClient
import io.vertx.core.http.HttpClientOptions
import io.vertx.core.http.HttpHeaders
import io.vertx.core.http.HttpServerResponse
import io.vertx.core.streams.Pump
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.util.LinkedList
import java.util.List
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.zip.Deflater
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import org.eclipse.xtend.lib.annotations.Accessors
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
	
	@Accessors val (List<File>) => Observable<File> indexer = [ uploadFiles ]
	
	new(Vertx vertx, String host, int port) {
		this.vertx = vertx
		
		val httpOptions = new HttpClientOptions => [
			defaultHost = host
			defaultPort = port
		]
		
		httpClient = vertx.createHttpClient(httpOptions)
	}
	
	def void proxyGET(String url, HttpServerResponse pResp, boolean withCache) {
		httpClient.get(url)[ dResp |
			pResp.chunked = true
			pResp.statusCode = dResp.statusCode
			pResp.headers.setAll = dResp.headers
			
			if (withCache)
				pResp.headers.add('Cache-Control', 'public, max-age=86400')
			
			dResp.handler[ pResp.write(it) ]
			dResp.endHandler[ pResp.end ]
		].end
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
				query('PatientID:' + pID).then([
					qr.merge(it)
					if (nResults.incrementAndGet == patientIds.size)
						promise.resolve(qr)
				], [
					promise.reject(it)
				])
			]
		]
		
		return pResult.promise
	}
	
	def Promise<Void> download(String sopInstanceUID, String filePath) {
		val PromiseResult<Void> pResult = [ promise |
			httpClient.getNow('/legacy/file?uid=' + sopInstanceUID)[ resp |
				if (resp.statusCode != 200) {
					promise.reject(new RuntimeException('Rejected status: ' + resp.statusCode))
					return
				}
				
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
	
	def Observable<File> uploadFiles(List<File> dcmFiles) {
		val ObservableResult<File> pResult = [ sub |
			val ready = new AtomicBoolean(true)
			val processed = new AtomicInteger(0)
			dcmFiles.forEach[ dcmFile |
				AsyncUtils.waitUntil([ready.get],[
					ready.set = false
					val req = httpClient.post('/ext/stow')[ resp |
						println('''upload-response: «resp.statusCode» «resp.statusMessage» for «dcmFile.name»''')
						if (resp.statusCode != 200) {
							sub.reject(new RuntimeException('''Dicoogle-Upload: «resp.statusCode» «resp.statusMessage»'''))
							return
						}
						
						sub.next(dcmFile)
						ready.set = true
						
						if (processed.incrementAndGet === dcmFiles.size)
							sub.complete
					]
					
					req => [
						chunked = true
						timeout = 60000
						putHeader(HttpHeaders.CONTENT_TYPE, "multipart/form-data; boundary=FileBoundary")
						putHeader(HttpHeaders.ACCEPT, "application/json")
					]
					
					val options = new OpenOptions => [ read = true]
					vertx.fileSystem.open(dcmFile.absolutePath, options)[
						if (failed) {
							sub.reject(cause)
						} else {
							req.write('--FileBoundary\r\n')
							req.write('Content-Disposition: form-data; name="file"; filename="' + UUID.randomUUID.toString + '.dcm"\r\n')
							req.write('Content-Type: application/dicom\r\n')
							req.write('\r\n')
							
							val file = result
							val pump = Pump.pump(file, req)
							file.endHandler[
								file.close[
									if (succeeded) {
										req.write('\r\n')
										req.write('--FileBoundary--\r\n')
										req.end
									} else {
										sub.reject(cause)
									}
								]
							]
							
							pump.start
						}
					]
				])
			]	
		]
		
		return pResult.observe
	}
	
	def Promise<Void> upload(String filePath) {
		val PromiseResult<Void> pResult = [ promise |
			val req = httpClient.post('/ext/stow')[ resp |
				println('''upload-response: «resp.statusCode» «resp.statusMessage»''')
				if (resp.statusCode != 200) {
					promise.reject(new RuntimeException('''Dicoogle-Upload: «resp.statusCode» «resp.statusMessage»'''))
					return
				}
				
				promise.resolve(null)
			]
			
			req => [
				chunked = true
				timeout = 60000
				putHeader(HttpHeaders.CONTENT_TYPE, "multipart/form-data; boundary=FileBoundary")
				putHeader(HttpHeaders.ACCEPT, "application/json")
			]
			
			/*
			//alternative, use with chunked = false
			val buffer = Buffer.buffer => [
				appendString('--FileBoundary\r\n')
				appendString('Content-Disposition: form-data; name="file"; filename="' + UUID.randomUUID.toString + '.dcm"\r\n')
				appendString('Content-Type: application/dicom\r\n')
				appendString('\r\n')
				
				try {
					appendBytes(Files.readAllBytes(Paths.get(filePath)))
				} catch (Exception e) {
					promise.reject(e)
					return
				}
				
				appendString('\r\n')
				appendString('--FileBoundary--\r\n')
			]
			req.end(buffer)
			*/
			
			
			val options = new OpenOptions => [ read = true]
			vertx.fileSystem.open(filePath, options)[
				if (failed) {
					promise.reject(cause)
				} else {
					req.write('--FileBoundary\r\n')
					req.write('Content-Disposition: form-data; name="file"; filename="' + UUID.randomUUID.toString + '.dcm"\r\n')
					req.write('Content-Type: application/dicom\r\n')
					req.write('\r\n')
					
					val file = result
					val pump = Pump.pump(file, req)
					file.endHandler[
						file.close[
							if (succeeded) {
								req.write('\r\n')
								req.write('--FileBoundary--\r\n')
								req.end
							} else {
								promise.reject(cause)
							}
						]
					]
					
					pump.start
				}
			]
		]
		
		return pResult.promise
	}
	
	def Observable<String> downloadUIDs(List<String> imagesUIDs, String zipFilePath) {
		val images = imagesUIDs.map[ uid | new Image => [ sopInstanceUID = uid ] ]
		return download(images, zipFilePath)
	}
	
	def Observable<String> download(List<Image> images, String zipFilePath) {
		val ObservableResult<String> pResult = [ sub |
			var FileOutputStream fos = null 
			try {
				fos = new FileOutputStream(zipFilePath)
			} catch(Exception ex) {
				sub.reject(ex)
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
							sub.reject(new TransferException(image.sopInstanceUID, resp.statusMessage))
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
							sub.reject(new TransferException(image.sopInstanceUID, resp.statusMessage))
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
								sub.reject(new TransferException(image.sopInstanceUID, it))
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