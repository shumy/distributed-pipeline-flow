package pt.ua.dpf.srv

import java.util.List
import pt.ua.dpf.dicoogle.DicoogleClient
import pt.ua.dpf.dicoogle.QueryResult
import pt.ua.dpf.dicoogle.TransferException
import rt.async.observable.Observable
import rt.async.observable.ObservableResult
import rt.data.Data
import rt.data.Optional
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

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
					dicoogle.transferTo(qr.allImages, pipe).subscribe([sopUID |
						sub.next(PatientTransfer.B => [ id = qr.findSopUID(sopUID).id ])
					], [
						sub.complete
						pipe.close
					], [
						sub.errorNotify(qr, it)
					])
				]
			]
		]
		
		return pResult.observe
	}
	
	@Public
	def Observable<PatientTransfer> downloadPatients(List<String> patientIds, String fileName) {
		//TODO: error on file already exists?
		
		val ObservableResult<PatientTransfer> pResult = [ sub |
			dicoogle.findPatients(patientIds).then[ qr |
				println('DOWNLOAD-PATIENTS: ' + qr.numResults)
				dicoogle.download(qr.allImages, './downloads/' + fileName + '.zip').subscribe([ sopUID |
					sub.next(PatientTransfer.B => [ id = qr.findSopUID(sopUID).id ])
				], [
					sub.complete
				], [
					sub.errorNotify(qr, it)
				])
			]
		]
		
		return pResult.observe
	}
	
	private def errorNotify(ObservableResult<PatientTransfer> sub, QueryResult qr, Throwable ex) {
		if (ex instanceof TransferException) {
			val tex = ex as TransferException
			println('TRANFER-ERROR: ' + tex.message)
			sub.next(PatientTransfer.B => [ id = qr.findSopUID(tex.sopUID).id error = tex.message ])
		} else {
			sub.reject(ex)
		}
	}
}

@Data
class PatientTransfer {
	@Optional val String id	//PatientID
	@Optional val String error
}