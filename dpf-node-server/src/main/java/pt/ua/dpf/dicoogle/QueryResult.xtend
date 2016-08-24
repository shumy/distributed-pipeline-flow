package pt.ua.dpf.dicoogle

import java.util.List
import pt.ua.dpf.dicoogle.model.Patient
import pt.ua.dpf.dicoogle.model.Image
import java.util.LinkedList

class QueryResult {
	public int numResults = 0
	public List<Patient> results
	
	def Patient findSopUID(String sopUID) {
		return results.findFirst[
			studies.findFirst[series.findFirst[ images.findFirst[ sopInstanceUID == sopUID] != null ] != null ] != null
		]
	}
	
	def List<Image> getAllImages() {
		val result = new LinkedList<Image>
		results.forEach[ result.addAll(allImages) ]
		
		return result
	}
	
	def void merge(QueryResult result) {
		this.numResults += result.numResults
		
		if (this.results == null) {
			this.results = result.results
		} else {
			this.results.addAll(result.results)
		}
	}
}