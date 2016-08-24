package pt.ua.dpf.srv

import java.util.List
import java.util.UUID
import pt.ua.dpf.dicoogle.DicoogleClient
import rt.async.pubsub.IPublisher
import rt.async.pubsub.IResource
import rt.data.Data
import rt.data.Default
import rt.data.Optional
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.vertx.server.service.RemoteSubscriber

@Service
@Data(metadata = false)
class TransferService {
	val IPublisher publisher
	
	val DicoogleClient dicoogle
	val ServicePointService srvPoint
	
	@Public
	@Context(name = 'resource', type = IResource)
	def String transferPatients(List<String> patientIds, String srvPointId) {
		val channel = srvPoint.getSrvPointChannel(srvPointId)
		if (channel === null)
			throw new ServiceException(500, 'No ServicePoint-ID available: ' + srvPointId)
		
		val respAddress = UUID.randomUUID.toString
		val ro = RemoteSubscriber.B => [ address = respAddress publisher = this.publisher ]
		
		val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
		channel.request(reqInfo).then[ pipe |
			println('CHANNEL-REQ-OK')
			dicoogle.findPatients(patientIds).then[ qr |
				println('TRANSFER-PATIENTS: ' + qr.numResults)
				dicoogle.transferTo(qr.allImages, pipe).next[ sopUID |
					ro.next(PatientTransfer.B => [ id = qr.findSopUID(sopUID).id ])
				].complete[
					ro.complete
					resource.unsubscribe(respAddress)
					pipe.close
				]
				//TODO: how to forward errors with Promise and Observable?
			]
		].error[
			println('TRANFER ERROR: ' + message)
			printStackTrace
		]
		
		resource.subscribe(respAddress)
		return respAddress
	}
	
	@Public
	def List<PatientTransfer> patientTransfers(String srvPointId) {
		return null
	}
}

@Data
class PatientTransfer {
	val String id	//PatientID
	
	@Default('1') val int value
	@Optional val String error
}