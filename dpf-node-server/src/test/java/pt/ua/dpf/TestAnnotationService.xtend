package pt.ua.dpf

import com.avaje.ebean.EbeanServerFactory
import com.avaje.ebean.config.ServerConfig
import org.junit.BeforeClass
import org.junit.Test
import pt.ua.dpf.srv.AnnotationService
import pt.ua.ieeta.rpacs.model.Image
import pt.ua.ieeta.rpacs.model.Patient
import pt.ua.ieeta.rpacs.model.Serie
import pt.ua.ieeta.rpacs.model.Study
import pt.ua.ieeta.rpacs.model.ext.Annotation
import pt.ua.ieeta.rpacs.model.ext.Annotator
import pt.ua.ieeta.rpacs.model.ext.Lesion
import rt.async.AsyncUtils
import rt.utils.interceptor.UserInfo

class TestAnnotationService {
	static val user = new UserInfo('micael', #[])
	
	@BeforeClass
	static def void setup() {
		EbeanServerFactory.create(new ServerConfig => [
			name = 'db'
			defaultServer = true
			
			addClass(Patient)
			addClass(Study)
			addClass(Serie)
			addClass(Image)
			
			addClass(Annotator)
			addClass(Annotation)
			addClass(Lesion)
			
			loadTestProperties
		])
	}
	
	@Test
	def void allNonAnnotatedImages() {
		AsyncUtils.setDefault
		val imgSrv = AnnotationService.create
		imgSrv.allNonAnnotatedImages(user).then[
			forEach[ println(it) ]	
		]
	}
}