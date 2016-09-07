package pt.ua.dpf.services

import rt.data.Data
import java.util.List

interface ServicePointInterface {
	def void create(SrvPoint srvPoint)
	def List<SrvPoint> srvPoints()
}

@Data
class SrvPoint {
	val String name
}