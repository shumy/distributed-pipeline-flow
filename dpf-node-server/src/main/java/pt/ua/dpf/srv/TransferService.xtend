package pt.ua.dpf.srv

import java.util.List
import java.util.UUID
import pt.ua.dpf.dicoogle.DicoogleClient
import pt.ua.dpf.dicoogle.QueryResult
import pt.ua.dpf.dicoogle.TransferException
import rt.async.pubsub.IPublisher
import rt.async.pubsub.IResource
import rt.data.Data
import rt.data.Optional
import rt.data.Validation
import rt.pipeline.pipe.channel.IPipeChannel.PipeChannelInfo
import rt.plugin.service.ServiceException
import rt.plugin.service.ServiceUtils
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.vertx.server.service.RemoteSubscriber

@Service
@Data(metadata = false)
class TransferService {
	transient var IPublisher publisher
	
	val DicoogleClient dicoogle
	val ServicePointService srvPoint
	
	@Validation
	def void constructor() {
		publisher = ServiceUtils.publisher
	}
	
	@Public
	@Context(name = 'resource', type = IResource)
	def String transferPatients(List<String> patientIds, String srvPointId) {
		val channel = srvPoint.getSrvPointChannel(srvPointId)
		if (channel === null)
			throw new ServiceException(500, 'No ServicePoint-ID available: ' + srvPointId)
		
		val respAddress = UUID.randomUUID.toString
		val ro = RemoteSubscriber.B => [ address = respAddress publisher = this.publisher ]
		
		dicoogle.findPatients(patientIds).thenTry[ qr |
			println('TRANSFER-PATIENTS: ' + qr.numResults)
			val reqInfo = new PipeChannelInfo(PipeChannelInfo.Type.SENDER)
			channel.request(reqInfo).then[ pipe |
				println('CHANNEL-REQ-OK')
				dicoogle.transferTo(qr.allImages, pipe).next[ sopUID |
					ro.next(PatientTransfer.B => [ id = qr.findSopUID(sopUID).id ])
				].complete[
					ro.complete
					resource.unsubscribe(respAddress)
					pipe.close
				].error[
					ro.errorNotify(qr, it)
				]
			]
		].error[ ex |
			ex.printStackTrace
			
			println('CHANNEL-ERROR: ' + ex.message)
			ro.error(ex.message)
			resource.unsubscribe(respAddress)
		]
		
		resource.subscribe(respAddress)
		return respAddress
	}
	
	@Public
	@Context(name = 'resource', type = IResource)
	def String downloadPatients(List<String> patientIds) {
		val respAddress = UUID.randomUUID.toString
		val ro = RemoteSubscriber.B => [ address = respAddress publisher = this.publisher ]
		
		dicoogle.findPatients(patientIds).then[ qr |
			println('DOWNLOAD-PATIENTS: ' + qr.numResults)
			dicoogle.download(qr.allImages, './downloads/d_' + respAddress + '.zip').next[ sopUID |
				ro.next(PatientTransfer.B => [ id = qr.findSopUID(sopUID).id ])
			].complete[
				ro.complete
				resource.unsubscribe(respAddress)
			].error[
				ro.errorNotify(qr, it)
			]
		].error[ ex |
			ex.printStackTrace
			
			println('DOWNLOAD-ERROR: ' + ex.message)
			ro.error(ex.message)
			resource.unsubscribe(respAddress)
		]
		
		resource.subscribe(respAddress)
		return respAddress
	}
	
	@Public
	def List<PatientTransfer> patientTransfers(String srvPointId) {
		return null
	}
	
	private def errorNotify(RemoteSubscriber ro, QueryResult qr, Throwable ex) {
		if (ex instanceof TransferException) {
			val tex = ex as TransferException
			println('TRANFER-ERROR: ' + tex.message)
			ro.next(PatientTransfer.B => [ id = qr.findSopUID(tex.sopUID).id error = tex.message ])
		} else {
			ro.error('Internal error: ' + ex.message)
		}
	}
}

@Data
class PatientTransfer {
	@Optional val String id	//PatientID
	@Optional val String error
}