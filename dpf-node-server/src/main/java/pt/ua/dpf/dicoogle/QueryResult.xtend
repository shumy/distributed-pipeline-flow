package pt.ua.dpf.dicoogle

import java.util.List
import pt.ua.dpf.dicoogle.model.Patient
import pt.ua.dpf.dicoogle.model.Image
import java.util.LinkedList

class QueryResult {
	public int numResults
	public List<Patient> results
	
	def List<Image> getAllImages() {
		val result = new LinkedList<Image>
		results.forEach[ result.addAll(allImages) ]
		
		return result
	}
}