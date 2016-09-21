package pt.ua.dpf.srv

import java.util.List
import pt.ua.dpf.dicoogle.DicoogleClient
import rt.async.observable.Observable
import rt.async.observable.ObservableResult
import rt.data.Data
import rt.data.Optional
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.pipeline.PathValidator
import java.nio.file.Files
import java.nio.file.Paths

@Service
@Data(metadata = false)
class TransferService {
	val DicoogleClient dicoogle
	val ServicePointService srvPoint
	
	@Public
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
						.onComplete[ pipe.close println('PIPE-CLOSED') ]
						.delegate(sub)
				]
			]
		]
		
		return pResult.observe
	}
	
	@Public
	def Observable<PatientTransfer> downloadPatients(List<String> patientIds, String fileName) {
		if (!PathValidator.isValid(fileName))
			throw new ServiceException(500, 'File name not accepted: ' + fileName)
			
		val filePath = './downloads/' + fileName + '.zip'
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
	}
}

@Data
class PatientTransfer {
	@Optional val String id	//PatientID
	@Optional val String error
}