package pt.ua.dpf.model

import rt.entity.Entity
import java.util.Map

@Entity
class ServicePoint {
	val String address
	
	val Map<String, NodePoint> nodes
	val Map<String, SafePoint> safes
	
	new(String address) {
		this.address = address
	}
}