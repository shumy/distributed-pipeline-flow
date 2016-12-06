package pt.ua.dpf.model.test

import java.util.List
import org.junit.Assert
import org.junit.BeforeClass
import org.junit.Test
import pt.ua.HSearch
import pt.ua.Hibernate
import pt.ua.model.dim.Image
import pt.ua.model.dim.Patient
import pt.ua.model.dim.Serie
import pt.ua.model.dim.Study
import pt.ua.srv.dim.LoadService

class LoadTest {
	
	@BeforeClass
	def static void setUp() {
		Hibernate.config[
			configure('hibernate-test-cfg.xml')
			addAnnotatedClass(Patient)
			addAnnotatedClass(Study)
			addAnnotatedClass(Serie)
			addAnnotatedClass(Image)
		]
	}
	
	def sortedPrint(List<Patient> patients) '''
		«FOR p: patients.sortWith[ x, y | (x.id - y.id) as int ]»
			Patient («p.id», «p.pid», «p.name», «p.sex», «p.birthDate»)
			«FOR s: p.studies.sortWith[ x, y | (x.id - y.id) as int ]»
				«' '»Study («s.id», «s.uid», «s.description», «s.date», «s.time», «s.accessionNumber», «s.institutionName», «s.institutionAddress») for Patient «s.patient.id»
				«FOR e: s.series.sortWith[ x, y | (x.id - y.id) as int ]»
					«'  '»Serie («e.id», «e.uid», «e.description», «e.modality», «e.number») for Study «e.study.id»
					«FOR i: e.images.sortWith[ x, y | (x.id - y.id) as int ]»
					«'   '»Image («i.id», «i.uid») for Image «i.serie.id»
					«ENDFOR»
				«ENDFOR»
			«ENDFOR»
		«ENDFOR»
	'''
	
	@Test
	def void testLoad() {
		val lSrv = LoadService.create
		lSrv.loadDirectory('./test-data').then[
			val pResult = toList
			Assert.assertEquals(pResult.length, 5)
			print(pResult.sortedPrint)
			
			Hibernate.session[ hs |
				val sResult = hs.createQuery('from Patient').list as List<Patient>
				Assert.assertEquals(pResult.sortedPrint.toString, sResult.sortedPrint.toString)
				
				/*Search.getFullTextSession(hs) => [
					val qb = searchFactory.buildQueryBuilder.forEntity(Patient).get
					val query = qb.keyword
						.onFields("studies.uid")
						.matching("1.3.6.1.4.1.9590.100.1.2.198956650312987235140455656212215442426")
						.createQuery
					
					val pQuery = createFullTextQuery(query, Patient)
					val results = pQuery.list as List<Patient>
					results.forEach[
						println('''Entity («id», «pid», «name», «sex», «birthDate»)''')
					]
				]*/
			]
			
			
			val search = HSearch.B => [
				defaultField = "name"
			]
			
			println('search-results: ')
			//"name:patient1 AND sex:m"
			search.search(Patient, "studies.series.uid:1.3.6.1.4.1.9590.100.1.2.300947888611072559213739432063705187405") => [
				forEach[ println('''Patient («id», «pid», «name», «sex», «birthDate»)''') ]
			]
			
			search.search(Study, "patient.name:Patient5") => [
				forEach[ println('''Study («id», «uid», «date»)''') ]
			]
		]
	}
}