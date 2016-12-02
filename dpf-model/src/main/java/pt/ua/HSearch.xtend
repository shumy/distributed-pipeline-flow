package pt.ua

import java.util.List
import org.apache.lucene.analysis.standard.StandardAnalyzer
import org.apache.lucene.queryparser.classic.QueryParser
import org.hibernate.search.Search
import rt.data.Data
import rt.data.Optional
import rt.data.Validation
import pt.ua.Hibernate

@Data
class HSearch {
	String defaultField
	
	@Optional List<Class<?>> queryEntities
	@Optional QueryParser parser
	
	@Validation
	def void constructor() {
		parser = new QueryParser(defaultField, new StandardAnalyzer)
	}
	
	def searchInEntities(String search, Class<?>... entities) {
		val luceneQuery = parser.parse(search)
		val List<Object> results = newArrayList
		
		Hibernate.session[
			Search.getFullTextSession(it) => [
				createFullTextQuery(luceneQuery, entities) => [
					iterate.forEach[ results.add(it) ]
				]
			]
		]
		
		return results
	}
	
	def <T> search(String search) {
		return searchInEntities(search, queryEntities)
	}
	
	def <T> search(Class<T> entity, String search) {
		return searchInEntities(search, entity) as List<T>
	}
}