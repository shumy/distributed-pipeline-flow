package pt.ua.dpf.srv

import com.avaje.ebean.Ebean
import java.util.Collections
import java.util.List
import java.util.Map
import pt.ua.ieeta.rpacs.model.ext.Annotator
import pt.ua.ieeta.rpacs.model.ext.Dataset
import rt.data.Data
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.utils.interceptor.UserInfo
import pt.ua.ieeta.rpacs.model.Image

@Data
@Service
class DatasetService {
	val String imagePrefixURI
	
	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def DatasetInfo myDefault() {
		val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
		val ds = thisAnnotator.currentDataset
		
		return DatasetInfo.B => [
			id = ds.id
			name = ds.name
			size = ds.images.size
			isDefault = true
			pointers = ds.pointers.filter[ annotator == thisAnnotator ].map[ pointer |
				PointerInfo.B => [
					type = pointer.type.name
					last = pointer.last
					next = pointer.next
				]
			].toMap[ type ]
		]
	}
	
	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def List<ImageRef> getImageRefsFromDefault(Integer offset, Integer limit) {
		val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
		val ds = thisAnnotator.currentDataset
		
		val images = Image.getImageRefs(ds, offset, limit)
		return images.map[ img |
			ImageRef.B => [
				id = img.id
				url = imagePrefixURI + img.uid
			]
		]
	}
	
	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def void setMyDefault(Long defaultId) {
		Ebean.execute[
			Annotator.getOrCreateAnnotator(user.name) => [
				val defDs = datasets.findFirst[ id === defaultId ]
				if (defDs !== null) {
					currentDataset = defDs
					save
				}
			]
		]
	}
	
	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def List<DatasetInfo> myDatasets() {
		val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
		if (thisAnnotator === null)
			return Collections.EMPTY_LIST
		
		return thisAnnotator.datasets.map[ ds |
			DatasetInfo.B => [
				id = ds.id
				name = ds.name
				size = ds.images.size
				isDefault = ( ds === thisAnnotator.currentDataset )
				pointers = ds.pointers.filter[ annotator == thisAnnotator ].map[ pointer |
					PointerInfo.B => [
						type = pointer.type.name
						last = pointer.last
						next = pointer.next
					]
				].toMap[ type ]
			]
		]
	}
	
	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def List<DatasetInfo> otherDatasets() {
		val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
		val otherDatasets = Dataset.find.query
			.fetch('pointers')
			.where
				.not.contains('annotators.name', thisAnnotator.name)
			.findList
		
		return otherDatasets.map[ ds |
			DatasetInfo.B => [
				id = ds.id
				name = ds.name
				size = ds.images.size
				isDefault = ds.isIsDefault
				pointers = Collections.EMPTY_MAP as Map<String, PointerInfo>
			]
		]
	}
	
	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def void subscribe(List<Long> ids) {
		Ebean.execute[
			val subscriptions = Dataset.find.query.where.idIn(ids).findList
			Annotator.getOrCreateAnnotator(user.name) => [
				datasets.addAll(subscriptions)
				save
			]
		]
	}
}

@Data
class DatasetInfo {
	Long id
	String name
	Integer size
	Boolean isDefault
	Map<String, PointerInfo> pointers
}

@Data
class PointerInfo {
	String type
	Long last
	Long next
}

@Data
class ImageRef {
	Long id
	String url
}