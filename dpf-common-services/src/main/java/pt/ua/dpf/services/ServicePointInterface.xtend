package pt.ua.dpf.services

import java.util.List
import rt.data.Data

interface ServicePointInterface {
	def void create(SrvPoint srvPoint)
	def List<SrvPoint> srvPoints()
}

@Data
class SrvPoint {
	val String id
	val String name
}