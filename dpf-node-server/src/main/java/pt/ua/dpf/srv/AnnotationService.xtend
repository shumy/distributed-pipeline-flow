package pt.ua.dpf.srv

import com.avaje.ebean.Ebean
import java.util.Collections
import java.util.Map
import pt.ua.ieeta.rpacs.model.Image
import pt.ua.ieeta.rpacs.model.ext.Annotation
import pt.ua.ieeta.rpacs.model.ext.AnnotationStatus
import pt.ua.ieeta.rpacs.model.ext.Annotator
import pt.ua.ieeta.rpacs.model.ext.Node
import pt.ua.ieeta.rpacs.model.ext.NodeType
import rt.data.Data
import rt.data.Optional
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.utils.interceptor.UserInfo

@Data
@Service
class AnnotationService {
	
	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def AnnotationInfo readAnnotation(Long inImageId) {
		val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
		
		val annotation = Annotation.find.query
			.setDisableLazyLoading(true)
			.fetch('nodes')
			.fetch('nodes.type', 'name')
			.where
				.eq('image.id', inImageId)
				.eq('annotator', thisAnnotator)
			.findUnique
			
		if (annotation === null)
			return AnnotationInfo.B => [
				imageId = inImageId
				nodes = Collections.EMPTY_MAP
			]
		
		return AnnotationInfo.B => [
			imageId = inImageId
			nodes = annotation.nodes.map[ node |
				NodeInfo.B => [
					id = node.id
					type = node.type.name
					fields = node.fields
				]
			].toMap[ type ]
		]
	}

	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def void saveAnnotation(AnnotationInfo annoInfo) {
		val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
		
		//find image...
		val thisImage = Image.find.query
			.fetch('annotations.annotator')
			.where
				.idEq(annoInfo.imageId)
			.findUnique
		
		if (thisImage === null)
			throw new ServiceException(404, 'Image not found! With id = ' + annoInfo.imageId)
		
		//calculate image-sequence
		val imageSeq = thisImage.getSequence(thisAnnotator.currentDataset)
		
		//find node types...
		val distinctTypeNames = annoInfo.nodes.keySet
		val thisNodeTypes = NodeType.find.query
			.where
				.in('name', annoInfo.nodes.keySet)
			.findList
			.toMap[ name ]
		
		if (thisNodeTypes.size !== distinctTypeNames.size)
			throw new ServiceException(404, 'Some node types not found!')
		
		//update or create annotation...
		Ebean.execute[
			val thisAnnotation = thisImage.annotations.findFirst[ annotator == thisAnnotator ] ?: (new Annotation => [
				status = AnnotationStatus.PARTIAL
				image = thisImage
				annotator = thisAnnotator
				save
			])
			
			//save all nodes if not empty
			annoInfo.nodes.forEach[ nType, nodeInfo |
				val nodeType = thisNodeTypes.get(nType)
				
				if (!nodeInfo.fields.empty) {
					val node = if (nodeInfo.id !== null) Node.find.byId(nodeInfo.id) else (new Node => [
						type = nodeType
						annotation = thisAnnotation
					])
					
					//new data...
					node.fields = nodeInfo.fields
					node.save
				}
				
				if (!nodeInfo.fields.empty || nodeInfo.implicit === true) {
					//update pointer if necessary
					thisAnnotator.getOrPreCreatePointer(nodeType) => [
						if (imageSeq >= next)
							next = imageSeq + 1L
						
						if (next > last)
							last = next - 1L
						save
					]
				}
			]
		]
		
		Ebean.defaultServer.docStore.indexByQuery(Image.find.query.setId(thisImage.id))
	}
}



@Data
class AnnotationInfo {
	@Optional String annotator
	
	Long imageId
	Map<String, NodeInfo> nodes
}

@Data
class NodeInfo {
	@Optional Long id
	@Optional Boolean implicit //no fields are needed when implicit is true to update the pointer
	
	String type
	Map<String, Object> fields
}