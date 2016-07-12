package pt.ua.dpf.dicoogle.model

import java.util.List
import java.util.LinkedList

class Patient {
	public String id
	public String name
	public String birthdate
	
	public int nStudies
	public List<Study> studies
	
	def List<Image> getAllImages() {
		val result = new LinkedList<Image>
		studies.forEach[ series.forEach[ images.forEach[ result.add(it) ] ] ]
		
		return result
	}
}