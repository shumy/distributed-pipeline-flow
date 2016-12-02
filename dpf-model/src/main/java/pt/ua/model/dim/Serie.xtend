package pt.ua.model.dim

import java.util.HashSet
import java.util.Set
import javax.persistence.Entity
import javax.persistence.GeneratedValue
import javax.persistence.Id
import javax.persistence.OneToMany
import org.apache.lucene.analysis.standard.StandardAnalyzer
import org.hibernate.search.annotations.Analyzer
import org.hibernate.search.annotations.DocumentId
import org.hibernate.search.annotations.Field
import org.hibernate.search.annotations.Indexed
import org.hibernate.search.annotations.IndexedEmbedded
import rt.data.Data
import rt.data.Optional

@Data @Entity @Indexed
@Analyzer(impl = StandardAnalyzer)
class Serie {
	@Id
	@GeneratedValue
	@DocumentId
	@Optional Long id
	
	@Field String uid
	@Field Integer number
	@Field String description
	//@Field Integer NumberOfSeriesRelatedInstances
	
	@OneToMany
	@IndexedEmbedded
	@Optional Set<Image> images = new HashSet<Image>
}