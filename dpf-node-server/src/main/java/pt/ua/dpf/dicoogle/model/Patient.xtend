package pt.ua.dpf.dicoogle.model

import java.util.Map
import java.util.List

class Patient {
	public String id
	public String name
	public String birthdate
	
	public int nStudies
	public List<Map<String, Object>> studies
}