package pt.ua.dpf.dicoogle

import com.google.gson.Gson
import io.vertx.core.Vertx
import io.vertx.core.file.OpenOptions
import io.vertx.core.http.HttpClient
import io.vertx.core.http.HttpClientOptions
import io.vertx.core.streams.Pump
import rt.pipeline.promise.Promise
import rt.pipeline.promise.PromiseResult

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
				
				exceptionHandler[ promise.reject(message) ]
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
						promise.reject(cause.message)
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
}