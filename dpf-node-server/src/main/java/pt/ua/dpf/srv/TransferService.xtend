package pt.ua.dpf.srv

import java.util.List
import rt.data.Data
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

@Service
@Data(metadata = false)
class TransferService {
	
	@Public
	def List<SrvPoint> srvPoints() {
		return null
	}
	
	@Public
	def void transferPatients(List<String> patients, String srvPointId) {
	
	}
	
	@Public
	def List<PatientTransfer> patientTransfers(String srvPointId) {
		return null
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