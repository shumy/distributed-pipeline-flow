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
import java.util.List
import rt.async.observable.Observable
import rt.plugin.service.an.Public
import rt.async.observable.ObservableResult
import rt.pipeline.UserInfo
import rt.plugin.service.an.Context
import rt.data.Optional
import java.util.Set
import rt.async.promise.Promise
import rt.async.promise.PromiseResult

@Data
@Service
class LoadService {
	//TODO: add load options (e.g: patients from DB are considered different, delete loaded file)
	//TODO: do I need a processing pipeline for anonymization
	
	@Optional val String folder
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Observable<IndexResult> indexFiles(Set<String> files) {
		val path = folder + '/' + user.name
		val fPath = new File(path)
		
		val dcmFiles = fPath.listFiles.filter[ files.contains(name) ].toList
		return dcmFiles.loadFiles
			.map[ ir | IndexResult.B => [ file = ir.file ] ]
	}
	
	def Observable<IndexResult> loadFiles(List<File> dcmFiles) {
		val ObservableResult<IndexResult> pResult = [ sub |
			Hibernate.session[ hs |
				val pQuery = hs.createQuery('from Patient as p where p.pid = :pid')
				val sQuery = hs.createQuery('from Study as s where s.uid = :uid')
				val eQuery = hs.createQuery('from Serie as s where s.uid = :uid')
				val iQuery = hs.createQuery('from Image as i where i.uid = :uid')
				
				dcmFiles.forEach[ file |
					println('LOAD-FILE: ' + file.name)
					
					val dStream = new DicomInputStream(file)
					try {
						dStream.readDicomObject => [
							val tx = hs.beginTransaction
								val oImage = loadImage(iQuery)
								
								val oSerie = loadSerie(eQuery)
								oSerie.addImage(oImage)
								
								val oStudy = loadStudy(sQuery)
								oStudy.addSerie(oSerie)
								
								val oPatient = loadPatient(pQuery)
								oPatient.addStudy(oStudy)
								
								hs.save(oPatient)
								sub.next(IndexResult.B => [ file = file.name patient = oPatient ])
							tx.commit
						]
					} catch (Exception ex) {
						sub.reject(new RuntimeException('Fail on index file: ' + file.name))
						throw ex //re-throw for hibernate rollback
					} finally {
						dStream.close
					}
				]
				
				sub.complete
			]
		]
		
		return pResult.observe
	}
	
	def Promise<Set<Patient>> loadDirectory(String path) {
		val fPath = new File(path)
		if (!fPath.directory)
			throw new ServiceException(404, 'Not a directory!')
		
		val loaded = new HashSet<Patient>
		val dcmFiles = fPath.listFiles.filter[ !directory && name.endsWith('.dcm') ].toList
		
		val PromiseResult<Set<Patient>> pResult = [ promise |
			dcmFiles.loadFiles.subscribe([
				loaded.add(patient)
			], [
				promise.resolve(loaded)
			])
		]
		
		return pResult.promise
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
			
			accessionNumber = dObject.getInt(Tag.AccessionNumber)
			
			institutionName = dObject.getString(Tag.InstitutionName)?:''
			institutionAddress = dObject.getString(Tag.InstitutionAddress)?:''
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
			modality = dObject.getString(Tag.Modality)
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

@Data
class IndexResult {
	val String file
	@Optional val Patient patient
}