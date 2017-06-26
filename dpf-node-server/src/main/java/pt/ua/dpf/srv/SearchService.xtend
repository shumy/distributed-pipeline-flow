package pt.ua.dpf.srv

import java.time.format.DateTimeFormatter
import java.util.List
import pt.ua.ieeta.rpacs.utils.DocSearch
import rt.data.Data
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

@Data
@Service
class SearchService {
	
	@Public(worker = true)
	def List<ImageInfo> search(String query) {
		val results = DocSearch.search(query, 0, 100)
		return results.map[ image |
			ImageInfo.B => [
				uid = image.uid
				laterality = image.laterality
				columns = image.columns
				rows = image.rows
				
				val dbPatient = image.serie.study.patient
				patient = PatientInfo.B => [
					name = dbPatient.name
					sex = dbPatient.sex
					birthdate = dbPatient.birthdate.format(DateTimeFormatter.ISO_LOCAL_DATE)
				]
				
				annotations = image.annotations.map[ anno |
					AnnotationInfo.B => [
						imageId = image.id
						nodes = anno.nodes.map[ node |
							NodeInfo.B => [
								type = node.type.name
								fields = node.fields
							]
						].toMap[ type ]
					]
				]
			]
		]
	}
}

@Data
class ImageInfo {
	String uid
	String laterality
	Integer columns
	Integer rows
	
	PatientInfo patient
	List<AnnotationInfo> annotations
}

@Data
class PatientInfo {
	String name
	String sex
	String birthdate
}