package pt.ua.dpf.srv

import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.file.Files
import java.nio.file.Paths
import java.util.List
import java.util.zip.Deflater
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import pt.ua.dpf.dicoogle.TransferException
import pt.ua.ieeta.rpacs.model.Image
import rt.async.AsyncUtils
import rt.async.observable.Observable
import rt.async.observable.ObservableResult
import rt.data.Data
import rt.data.Optional
import rt.pipeline.PathValidator
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.utils.interceptor.UserInfo

@Service
@Data(metadata = false)
class TransferService {
	//val DicoogleClient dicoogle
	//val ServicePointService srvPoint
	
	val String folder
	val String dicoogleUrl
	
	/*@Public
	def Observable<PatientTransfer> transferPatients(List<String> patientIds, String srvPointId) {
		val channel = srvPoint.getSrvPointChannel(srvPointId)
		if (channel === null)
			throw new ServiceException(500, 'No ServicePoint-ID available: ' + srvPointId)
		
		val ObservableResult<PatientTransfer> pResult = [ sub |
			dicoogle.findPatients(patientIds).then[ qr |
				println('TRANSFER-PATIENTS: ' + qr.numResults)
				val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
				channel.request(reqInfo).then[ pipe |
					dicoogle.transferTo(qr.allImages, pipe)
						.map[ sopUID | PatientTransfer.B => [ id = qr.findSopUID(sopUID).id ] ]
						.onComplete[ pipe.close ]
						.delegate(sub)
				]
			]
		]
		
		return pResult.observe
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Observable<PatientTransfer> downloadPatients(List<String> patientIds, String fileName) {
		if (!PathValidator.isValid(fileName))
			throw new ServiceException(500, 'File name not accepted: ' + fileName)
		
		val dirPath = folder + '/' + user.name
		val fFolder = new File(dirPath)
		if (!fFolder.exists) fFolder.mkdirs
		
		val filePath = dirPath + '/' + fileName + '.zip'
		if (Files.exists(Paths.get(filePath)))
			throw new ServiceException(500, 'File already exists: ' + fileName)
		
		val ObservableResult<PatientTransfer> pResult = [ sub |
			dicoogle.findPatients(patientIds).then[ qr |
				println('DOWNLOAD-PATIENTS: ' + qr.numResults)
				dicoogle.download(qr.allImages, filePath)
					.map[ sopUID | PatientTransfer.B => [ id = qr.findSopUID(sopUID).id ] ]
					.delegate(sub)
			]
		]
		
		return pResult.observe
	}*/
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Observable<TransferInfo> downloadImages(List<String> imageUIDs, List<String> dataTypes, String fileName) {
		if (!PathValidator.isValid(fileName))
			throw new ServiceException(500, 'File name not accepted: ' + fileName)
		
		val dirPath = folder + '/' + user.name
		val fFolder = new File(dirPath)
		if (!fFolder.exists) fFolder.mkdirs
		
		val filePath = dirPath + '/' + fileName + '.zip'
		if (Files.exists(Paths.get(filePath)))
			throw new ServiceException(500, 'File already exists: ' + fileName)
			
		val zipFile = newZip(filePath)
		val ObservableResult<TransferInfo> pResult = [ sub |
			AsyncUtils.task[
				imageUIDs.forEach[ uid |
					try {
						if (!dataTypes.contains('ndcm')) {
							val url = new URL(dicoogleUrl + '/legacy/file?uid=' + uid)
							val httpConn = url.openConnection as HttpURLConnection
							if (httpConn.responseCode == HttpURLConnection.HTTP_OK) {
								zipFile.putNextEntry(new ZipEntry(uid + '.dcm'))
									val inputStream = httpConn.inputStream
									val buffer = newByteArrayOfSize(1024*1024)
									
									var bytesRead = -1
									while ((bytesRead = inputStream.read(buffer)) != -1)
										zipFile.write(buffer, 0, bytesRead)
									
									inputStream.close
								zipFile.closeEntry
							} else
								throw new RuntimeException('Dicoogle replied HTTP code: ' + httpConn.responseCode)
							httpConn.disconnect
						}
						
						if (dataTypes.contains('anno')) {
							val image = Image.findByUID(uid)
							val imageInfo = SearchService.toImageInfo(image)
							
							zipFile.putNextEntry(new ZipEntry(uid + '.json'))
								zipFile.write(imageInfo.toJson.getBytes("UTF-8"))
							zipFile.closeEntry
						}
						
						AsyncUtils.schedule[
							sub.next(TransferInfo.B => [ id = uid ])
						]
					} catch(Throwable ex) {
						zipFile.close
						Files.delete(Paths.get(filePath))
						AsyncUtils.schedule[
							sub.reject(new TransferException(uid, ex.message))
						]
					}
				]
				
				zipFile => [ flush close ]
				return null
			].then[
				println('DOWNLOAD-TASK-COMPLETED')
				sub.complete
			]
		]
		
		return pResult.observe
	}
	
	def ZipOutputStream newZip(String filePath) {
		var FileOutputStream fos = null
		try {
			fos = new FileOutputStream(filePath)
			val zipOut = new ZipOutputStream(fos)
			zipOut.level = Deflater.DEFAULT_COMPRESSION
			return zipOut
		} catch(Exception ex) {
			throw new ServiceException(500, 'Fail to open zip: ' + filePath)
		}
	}
}

@Data
class TransferInfo {
	@Optional val String id	//PatientID
	@Optional val String error
}