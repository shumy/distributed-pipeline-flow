package pt.ua.dpf.model

import rt.entity.Entity

@Entity
class NodePoint {
	val String address
	
	new(String address) {
		this.address = address
	}
}