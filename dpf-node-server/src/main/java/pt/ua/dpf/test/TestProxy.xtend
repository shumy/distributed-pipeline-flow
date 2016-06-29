package pt.ua.dpf.test

import rt.plugin.service.ServiceProxy
import pt.ua.dpf.services.TestInterface

@ServiceProxy(TestInterface)
interface TestProxy {}