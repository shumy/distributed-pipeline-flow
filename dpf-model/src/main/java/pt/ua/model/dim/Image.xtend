package pt.ua.model.dim

import javax.persistence.Entity
import javax.persistence.GeneratedValue
import javax.persistence.Id
import javax.persistence.JoinColumn
import javax.persistence.ManyToOne
import org.apache.lucene.analysis.standard.StandardAnalyzer
import org.hibernate.search.annotations.Analyzer
import org.hibernate.search.annotations.DocumentId
import org.hibernate.search.annotations.Field
import org.hibernate.search.annotations.Indexed
import rt.data.Data
import rt.data.Optional
import org.hibernate.search.annotations.IndexedEmbedded

@Data @Entity @Indexed
@Analyzer(impl = StandardAnalyzer)
class Image {
	@Id
	@GeneratedValue
	@DocumentId
	@Optional Long id
	
	@ManyToOne
	@JoinColumn(name="ref_serie")
	@IndexedEmbedded(depth = 1)
	@Optional Serie serie
	
	@Field String uid
	//TODO: url or other reference to the data file
}