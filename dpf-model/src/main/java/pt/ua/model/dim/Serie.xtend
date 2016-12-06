package pt.ua.model.dim

import java.util.HashSet
import java.util.Set
import javax.persistence.Entity
import javax.persistence.GeneratedValue
import javax.persistence.Id
import javax.persistence.JoinColumn
import javax.persistence.ManyToOne
import javax.persistence.OneToMany
import org.apache.lucene.analysis.standard.StandardAnalyzer
import org.hibernate.search.annotations.Analyzer
import org.hibernate.search.annotations.DocumentId
import org.hibernate.search.annotations.Field
import org.hibernate.search.annotations.Indexed
import org.hibernate.search.annotations.IndexedEmbedded
import rt.data.Data
import rt.data.Optional
import org.hibernate.search.annotations.ContainedIn

@Data @Entity @Indexed
@Analyzer(impl = StandardAnalyzer)
class Serie {
	@Id
	@GeneratedValue
	@DocumentId
	@Optional Long id
	
	@ManyToOne
	@JoinColumn(name="ref_study")
	@IndexedEmbedded(depth = 1)
	@Optional Study study
	
	@Field String uid
	@Field String description
	@Field String modality
	@Field Integer number
	
	//@Field Integer NumberOfSeriesRelatedInstances
	
	@ContainedIn
	@IndexedEmbedded
	@OneToMany(mappedBy = "serie", cascade = ALL)
	@Optional Set<Image> images = new HashSet<Image>
	
	def addImage(Image image) {
		image.serie = this
		images.add(image)
	}
}