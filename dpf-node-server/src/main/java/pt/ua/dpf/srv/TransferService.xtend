package pt.ua.dpf.srv

import java.util.List
import pt.ua.dpf.dicoogle.DicoogleClient
import rt.data.Data
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

@Service
@Data(metadata = false)
class TransferService {
	val DicoogleClient dicoogle
	val ServicePointService srvPoint
	
	@Public
	def void transferPatients(List<String> patientIds, String srvPointId) {
		val channel = srvPoint.getSrvPointChannel(srvPointId)
		val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
		channel.request(reqInfo).then([ pipe |
			println('CHANNEL-REQ-OK')
			patientIds.forEach[
				println('TRANSFER: ' + it)
				dicoogle.query('PatientID:' + it).then[
					dicoogle.transferTo(allImages, pipe)
				]
			]
			//TODO: close channel on end!
		], [
			println('CHANNEL-REQ-ERROR: ' + it)
		])
	}
	
	@Public
	def List<PatientTransfer> patientTransfers(String srvPointId) {
		return null
	}
}

@Data
class PatientTransfer {
	val String id	//PatientID
	val int transferred
	val int errors
	val String lastErrorMessage
}