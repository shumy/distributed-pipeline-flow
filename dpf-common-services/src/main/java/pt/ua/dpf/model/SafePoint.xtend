package pt.ua.dpf.model

import rt.entity.Entity

@Entity
class SafePoint {
	val String address
	
	new(String address) {
		this.address = address
	}
}