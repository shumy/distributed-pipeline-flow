package pt.ua.dpf.srv

import com.avaje.ebean.Ebean
import java.util.HashMap
import java.util.List
import java.util.Map
import java.util.UUID
import pt.ua.ieeta.rpacs.model.Image
import pt.ua.ieeta.rpacs.model.ext.Annotation
import pt.ua.ieeta.rpacs.model.ext.Annotator
import pt.ua.ieeta.rpacs.model.ext.ImageLocal
import pt.ua.ieeta.rpacs.model.ext.ImageQuality
import pt.ua.ieeta.rpacs.model.ext.Maculopathy
import pt.ua.ieeta.rpacs.model.ext.Photocoagulation
import pt.ua.ieeta.rpacs.model.ext.Retinopathy
import rt.async.AsyncUtils
import rt.async.promise.Promise
import rt.data.Data
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.utils.interceptor.UserInfo

@Data
@Service
class AnnotationService {
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Promise<List<ImageRef>> allNonAnnotatedImages() {
		AsyncUtils.task[
			val thisAnnotator = getOrCreateAnnotator(user)
			val qAnnotated = Annotation.find.query
				.select('image')
				.where
					.eq('draft', false)
					.eq('annotator', thisAnnotator)
				.query
				
			Image.find.query
				.setDisableLazyLoading(true)
				.where
					.not.in('id', qAnnotated)
				.setMaxRows(100)
			.findIterate.map[ img |
				ImageRef.B => [ id = img.id url = 'http://localhost:9090/proxy/dic2png/' + img.uid ]
			].toList
		]
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Map<String, Object> readAnnotation(Long id) {
		val annotator = getOrCreateAnnotator(user)
		
		val anno = Annotation.find.byId(id)
		if (anno === null || anno.annotator !== annotator)
			throw new ServiceException(404, 'Not found or not available for the annotator!')
		
		new HashMap<String, Object> => [
			put('id', anno.id)
			put('image', anno.image.id)
			
			put('quality', anno.quality)
			put('local', anno.local)
			
			put('retinopathy', anno.retinopathy)
			put('maculopathy', anno.maculopathy)
			put('photocoagulation', anno.photocoagulation)
		]
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Long createAnnotation(Map<String, Object> annoInfo) {
		if (annoInfo.get('image') === null)
			throw new ServiceException(500, 'Provide (image:id) for create!')
		
		val refImage = annoInfo.get('image') as Double
		Ebean.execute[
			val anno = new Annotation => [
				image = Image.find.byId(refImage.longValue)
				annotator = getOrCreateAnnotator(user)
				
				setDefaults
				setAnnotationValues(annoInfo)
				save
			]
			
			anno.id
		]
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def void updateAnnotation(Map<String, Object> annoInfo) {
		if (annoInfo.get('id') === null)
			throw new ServiceException(500, 'Provide (id) for update!')
		
		val id = annoInfo.get('id') as Double
		Ebean.execute[
			Annotation.find.byId(id.longValue) => [
				setAnnotationValues(annoInfo)
				save
			]
		]
	}
	
	def void setAnnotationValues(Annotation anno, Map<String, Object> annoInfo) {
		annoInfo.forEach[ key, value |
			if (key == 'quality')
				anno.quality = ImageQuality.valueOf(value as String)
			
			if (key == 'local')
				anno.local = ImageLocal.valueOf(value as String)
			
			if (key == 'retinopathy')
				anno.retinopathy = Retinopathy.valueOf(value as String)
			
			if (key == 'maculopathy')
				anno.maculopathy = Maculopathy.valueOf(value as String)
			
			if (key == 'photocoagulation')
				anno.photocoagulation = Photocoagulation.valueOf(value as String)
		]
	}
	
	def Annotator getOrCreateAnnotator(UserInfo user) {
		if (user === null)
			throw new ServiceException(500, 'User for annotator not available!')
		
		var annotator = Annotator.findByName(user.name)
		if (annotator === null) {
			val tx = Ebean.beginTransaction
			try {
				annotator = new Annotator() => [
					name = user.name
					alias = UUID.randomUUID.toString
				]
				
				annotator.save
				tx.commit
			} catch(Throwable ex) {
				ex.printStackTrace
				tx.rollback
			}
		}
		
		return annotator
	}
}

@Data
class ImageRef {
	Long id
	String url
}