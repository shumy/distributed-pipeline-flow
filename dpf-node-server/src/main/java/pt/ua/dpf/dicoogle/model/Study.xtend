package pt.ua.dpf.dicoogle.model

import java.util.List

class Study {
	public String studyInstanceUID
	public String modalities
	public String studyDate
	public String studyDescription
	public String institutionName
	
	public List<Serie> series
}