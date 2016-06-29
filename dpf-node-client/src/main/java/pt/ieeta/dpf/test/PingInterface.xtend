package pt.ieeta.dpf.test

import rt.plugin.service.Promise

interface PingInterface {
	def Promise<Void> ping(String name)
}