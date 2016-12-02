package pt.ua.srv.dim

import java.io.File
import java.util.HashSet
import org.dcm4che2.data.DicomObject
import org.dcm4che2.data.Tag
import org.dcm4che2.io.DicomInputStream
import org.hibernate.Query
import pt.ua.Hibernate
import pt.ua.model.dim.Patient
import pt.ua.model.dim.Serie
import pt.ua.model.dim.Study
import pt.ua.model.dim.Image
import rt.data.Data
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Service

@Data
@Service
class LoadService {
	
	def loadDirectory(String path) {
		//TODO: add load options (e.g: patients from DB are considered different)
		//TODO: do I need a processing pipeline for anonymization
		
		val fPath = new File(path)
		if (!fPath.directory)
			throw new ServiceException(404, 'Not a directory!')
		
		val loaded = new HashSet<Patient>
		val dcmFiles = fPath.listFiles.filter[ !directory && name.endsWith('.dcm') ]
		
		Hibernate.session[ hs |
			val pQuery = hs.createQuery('from Patient as p where p.pid = :pid')
			val sQuery = hs.createQuery('from Study as s where s.uid = :uid')
			val eQuery = hs.createQuery('from Serie as s where s.uid = :uid')
			val iQuery = hs.createQuery('from Image as i where i.uid = :uid')
			
			dcmFiles.forEach[
				println('LOAD-FILE: ' + name)
				
				val dStream = new DicomInputStream(it)
				dStream.readDicomObject => [
					val tx = hs.beginTransaction
						val image = loadImage(iQuery)
						hs.save(image)
						
						val serie = loadSerie(eQuery)
						serie.images.add(image)
						hs.save(serie)
						
						val study = loadStudy(sQuery)
						study.series.add(serie)
						hs.save(study)
						
						val patient = loadPatient(pQuery)
						patient.studies.add(study)
						hs.save(patient)
						
						loaded.add(patient)
					tx.commit
				]
			]
		]
		
		return loaded
	}
	
	def loadPatient(DicomObject dObject, Query query) {
		val qid = dObject.getString(Tag.PatientID)
		query.setParameter("pid", qid)
		
		val results = query.list
		if (results.length !== 0)
			return results.get(0) as Patient
		
		return Patient.B => [
			pid = qid
			name = dObject.getString(Tag.PatientName)
			sex = dObject.getString(Tag.PatientSex)
			birthDate = dObject.getString(Tag.PatientBirthDate)
		]
	}
	
	def loadStudy(DicomObject dObject, Query query) {
		val qid = dObject.getString(Tag.StudyInstanceUID)
		query.setParameter("uid", qid)
		
		val results = query.list
		if (results.length !== 0)
			return results.get(0) as Study
		
		return Study.B => [
			uid = qid
			description = dObject.getString(Tag.StudyDescription)?:''
			date = dObject.getString(Tag.StudyDate)
			time = dObject.getString(Tag.StudyTime)?:''
		]
	}
	
	def loadSerie(DicomObject dObject, Query query) {
		val qid = dObject.getString(Tag.SeriesInstanceUID)
		query.setParameter("uid", qid)
		
		val results = query.list
		if (results.length !== 0)
			return results.get(0) as Serie
		
		return Serie.B => [
			uid = qid
			description = dObject.getString(Tag.SeriesDescription)?:''
			number = dObject.getInt(Tag.SeriesNumber)
		]
	}
	
	def loadImage(DicomObject dObject, Query query) {
		val qid = dObject.getString(Tag.SOPInstanceUID)
		query.setParameter("uid", qid)
		val results = query.list
		
		if (results.length !== 0)
			return results.get(0) as Image
		
		return Image.B => [
			uid = qid
		]
	}
}