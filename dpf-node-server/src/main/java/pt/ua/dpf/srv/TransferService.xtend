package pt.ua.dpf.srv

import java.util.List
import pt.ua.dpf.dicoogle.DicoogleClient
import rt.data.Data
import rt.data.DataRepository
import rt.data.Default
import rt.data.Optional
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

@Service
@Data(metadata = false)
class TransferService {
	val DataRepository<PatientTransfer> repo
	
	val DicoogleClient dicoogle
	val ServicePointService srvPoint
	
	@Public
	def void transferPatients(List<String> patientIds, String srvPointId) {
		val channel = srvPoint.getSrvPointChannel(srvPointId)
		if (channel === null)
			throw new ServiceException(500, 'No ServicePoint-ID available: ' + srvPointId)
		
		val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
		channel.request(reqInfo)
			.then[ pipe |
				println('CHANNEL-REQ-OK')
				patientIds.forEach[ pID |
					println('TRANSFER-PATIENT: ' + pID)
					dicoogle.query('PatientID:' + pID)
						.then[
							val rTotal = allImages.size
							dicoogle.transferTo(allImages, pipe)
								.then[ transferred |
									repo.put(pID, PatientTransfer.B => [ id = pID total = rTotal value = transferred ])
								]
								.error[ ex |
									repo.put(pID, PatientTransfer.B => [ id = pID error = ex.message ])
								]
						]
						.error[ ex |
							repo.put(pID, PatientTransfer.B => [ id = pID error = ex.message ])
						]
				]
				//TODO: close channel on end!
			]
			.error[
				println('CHANNEL-REQ-ERROR: ' + it)
				patientIds.forEach[ pID |
					repo.put(pID, PatientTransfer.B => [ id = pID error = 'Error on opening channel to ServicePoint' ])
				]
			]
	}
	
	@Public
	def List<PatientTransfer> patientTransfers(String srvPointId) {
		return repo.list
	}
}

@Data
class PatientTransfer {
	val String id	//PatientID
	
	@Default('0') val int total
	@Default('0') val int value
	@Optional val String error
}