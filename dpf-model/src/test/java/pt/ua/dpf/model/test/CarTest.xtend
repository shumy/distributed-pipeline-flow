package pt.ua.dpf.model.test

import org.apache.lucene.analysis.standard.StandardAnalyzer
import org.apache.lucene.queryparser.classic.QueryParser
import org.hibernate.search.Search
import org.junit.BeforeClass
import org.junit.Test
import pt.ua.dpf.model.Car
import org.junit.Assert
import pt.ua.Hibernate
import pt.ua.HSearch

class CarTest {
	
	def static void populateDBWithTestData() {
		Hibernate.session[
			val tx = beginTransaction
			
			save(Car.B => [
				make = "Shelby American"
				model = "GT 350"
				year = 1967
				description = "This is Tim's car!"
			])
			
			save(Car.B => [
				make = "Chevrolet"
				model = "Bel Air"
				year = 1957
				description = "This is a true classic"
			])
			
			tx.commit
		]
	}
	
	@BeforeClass
	def static void setUp() {
		Hibernate.config[
			configure('hibernate-test-cfg.xml')
			addAnnotatedClass(Car)
		]
		
		populateDBWithTestData
	}
	
	@Test
	def void testQuery() {
		Hibernate.session[
			val result = createQuery("select c from Car as c").list
			
			val car1 = result.get(0) as Car
			Assert.assertEquals(
				'''(«car1.id», «car1.make», «car1.model», «car1.year», «car1.description»)'''.toString,
				"(1, Shelby American, GT 350, 1967, This is Tim's car!)"
			)
			
			val car2 = result.get(1) as Car
			Assert.assertEquals(
				'''(«car2.id», «car2.make», «car2.model», «car2.year», «car2.description»)'''.toString,
				"(2, Chevrolet, Bel Air, 1957, This is a true classic)"
			)
		]
	}
	
	@Test
	def void testProjectionSearch() {
		val searchString = "description:classic"
		val luceneQuery = new QueryParser("model", new StandardAnalyzer).parse(searchString)
		
		Hibernate.session[ session |
			Search.getFullTextSession(session) => [
				createFullTextQuery(luceneQuery) => [
					setProjection("id", "model")
					list.forEach[
						val value = it as Object[] //projection result
						println('''Projection («value.get(0)», «value.get(1)»)''')
					]
				]
			]
		]
	}
	
	@Test
	def void testEntitySearch() {
		val ss = HSearch.B => [
			defaultField = "description"
		]
		
		ss.search(Car, "classic") => [
			forEach[ println('''Entity («id», «make», «model», «year», «description»)''') ]
		]
	}
}