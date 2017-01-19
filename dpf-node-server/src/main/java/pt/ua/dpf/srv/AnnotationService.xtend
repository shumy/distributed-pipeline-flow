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
import rt.data.Data
import rt.pipeline.UserInfo
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

@Data
@Service
class AnnotationService {
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def List<Long> allNonAnnotatedImages() {
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
		.findIterate.map[ id ].toList
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Map<String, Object> readAnnotation(Long id) {
		val annotator = getOrCreateAnnotator(user)
		
		val anno = Annotation.find.byId(id)
		if (anno === null || anno.annotator !== annotator)
			throw new ServiceException(404, 'Not found or not available for the annotator!')
		
		new HashMap<String, Object> => [
			put('draft', anno.draft)
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
	def Long createAnnotation(Map<String, String> annoInfo) {
		if (annoInfo.get('image') === null)
			throw new ServiceException(500, 'Provide (image:id) for create!')
		
		val refImage = Long.parseLong(annoInfo.get('image'))
		Ebean.execute[
			val anno = new Annotation => [
				image = Image.find.byId(refImage)
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
	def void updateAnnotation(Map<String, String> annoInfo) {
		if (annoInfo.get('id') === null)
			throw new ServiceException(500, 'Provide (id) for update!')
		
		val id = Long.parseLong(annoInfo.get('id'))
		Ebean.execute[
			Annotation.find.byId(id) => [
				setAnnotationValues(annoInfo)
				save
			]
		]
	}
	
	def void setAnnotationValues(Annotation anno, Map<String, String> annoInfo) {
		annoInfo.forEach[ key, value |
			if (key == 'local')
				anno.local = ImageLocal.valueOf(value as String)
			
			if (key == 'quality')
				anno.quality = ImageQuality.valueOf(value as String)
			
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