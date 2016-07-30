package pt.ua.dpf.srv

import java.util.List
import rt.async.AsyncUtils
import rt.data.Data
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.vertx.server.web.service.Change
import rt.vertx.server.web.service.ObserverService

@Service
@Data(metadata = false)
class TransferService {
	
	@Public
	def List<SrvPoint> srvPoints() {
		return null
	}
	
	@Public
	@Context(name = 'observers', type = ObserverService)
	def String srvPointObserver() {
		println('srvPointObserver()')
		val obs = observers.register()
		//TODO: use the obs...
		AsyncUtils.periodic(5000)[
			obs.next(Change.B => [ oper = Change.ADD data = #{ 'x' -> Math.random, 'y' -> Math.random } ])
		]
		
		return obs.id
	}
	
	@Public
	def void transferPatients(List<String> patients, String srvPointId) {
	
	}
	
	@Public
	def List<PatientTransfer> patientTransfers(String srvPointId) {
		return null
	}
	
	@Public
	@Context(name = 'observers', type = ObserverService)
	def String patientTransferObserver(String srvPointId) {
		val obs = observers.register()
		//TODO: use the obs...
		
		return obs.id
	}
}

@Data
class SrvPoint {
	val String id
	val String name
}

@Data
class PatientTransfer {
	val String id	//PatientID
	val int transferred
	val int errors
	val String lastErrorMessage
}