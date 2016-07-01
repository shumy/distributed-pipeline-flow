package pt.ua.dpf.test

import rt.plugin.service.an.ServiceProxy
import pt.ua.dpf.services.PingInterface

@ServiceProxy(PingInterface)
interface PingProxy {}