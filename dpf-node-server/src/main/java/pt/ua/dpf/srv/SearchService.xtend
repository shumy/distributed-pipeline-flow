package pt.ua.dpf.srv

import com.fasterxml.jackson.databind.ObjectMapper
import java.time.format.DateTimeFormatter
import java.util.List
import pt.ua.ieeta.rpacs.model.Image
import pt.ua.ieeta.rpacs.utils.DocSearch
import rt.data.Data
import rt.data.Optional
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

@Data
@Service
class SearchService {
	
	@Public(worker = true)
	def List<ImageInfo> search(String query) {
		val results = DocSearch.search(query, 0, 0)
		return results.map[ toImageInfo ]
	}
	
	def static toImageInfo(Image image) {
		val dbSerie = image.serie
		val dbPatient = image.serie.study.patient
		
		ImageInfo.B => [
			uid = image.uid
			datetime = dbSerie.datetime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME).replaceAll('T', ' ')
			
			modality = dbSerie.modality
			stationName = dbSerie.stationName
			manufacturer = dbSerie.manufacturer
			manufacturerModelName = dbSerie.manufacturerModelName
			
			
			laterality = image.laterality
			columns = image.columns
			rows = image.rows
			
			patient = PatientInfo.B => [
				pid = dbPatient.pid
				sex = dbPatient.sex
				birthdate = dbPatient.birthdate.format(DateTimeFormatter.ISO_LOCAL_DATE)
			]
			
			annotations = image.annotations.map[ anno |
				AnnotationInfo.B => [
					imageId = image.id
					annotator = anno.annotator.alias
					nodes = anno.nodes.map[ node |
						NodeInfo.B => [
							type = node.type.name
							fields = node.fields
							node.fields.put('createdAt', node.createdAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME).replaceAll('T', ' '))
						]
					].toMap[ type ]
				]
			]
		]
	}
}

@Data
class ImageInfo {
	String uid
	String datetime
	
	String modality
	@Optional String stationName
	@Optional String manufacturer
	@Optional String manufacturerModelName
	
	String laterality
	Integer columns
	Integer rows
	
	PatientInfo patient
	List<AnnotationInfo> annotations
	
	def toJson() {
		val mapper = new ObjectMapper
		
		val jsonString = '''{
			"uid": "«uid»",
			"datetime": "«datetime»",
			
			"modality": "«modality»",
			"stationName": "«stationName»",
			"manufacturer": "«manufacturer»",
			"manufacturerModelName": "«manufacturerModelName»",
			
			"laterality": "«laterality»",
			"columns": «columns»,
			"rows": «rows»,
			"patient": {
				"pid": "«patient.pid»",
				"sex": "«patient.sex»",
				"birthdate": "«patient.birthdate»"
			},
			"annotations": [
				«FOR anno: annotations SEPARATOR ','»{
					"annotator":"«anno.annotator»"«IF !anno.nodes.empty»,«ENDIF»
					«FOR node: anno.nodes.values SEPARATOR ','»
						"«node.type»": «mapper.writeValueAsString(node.fields)»
					«ENDFOR»
				}«ENDFOR»
			]
		}'''.toString
		
		//validate json and pretty print...
		val json = mapper.readValue(jsonString, Object)
		return mapper.writerWithDefaultPrettyPrinter.writeValueAsString(json)
	}
}

@Data
class PatientInfo {
	String pid
	String sex
	String birthdate
}