package pt.ua.dpf.model

import javax.persistence.Entity
import javax.persistence.GeneratedValue
import javax.persistence.Id
import org.apache.lucene.analysis.standard.StandardAnalyzer
import org.hibernate.search.annotations.Analyzer
import org.hibernate.search.annotations.DocumentId
import org.hibernate.search.annotations.Field
import org.hibernate.search.annotations.Indexed
import org.hibernate.search.annotations.Store
import rt.data.Data
import rt.data.Optional

@Data @Entity @Indexed
@Analyzer(impl = StandardAnalyzer)
class Car {
	@Id
	@GeneratedValue
	@DocumentId
	@Optional Long id

	@Field(store = Store.YES)
	String make

	@Field(store = Store.YES)
	String model

	@Field(store = Store.YES)
	Integer year

	@Field(store = Store.NO)
	String description
}