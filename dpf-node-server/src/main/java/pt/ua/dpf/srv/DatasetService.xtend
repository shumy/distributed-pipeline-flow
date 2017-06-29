package pt.ua.dpf.srv

import com.avaje.ebean.Ebean
import java.util.Collections
import java.util.List
import java.util.Map
import pt.ua.ieeta.rpacs.model.Image
import pt.ua.ieeta.rpacs.model.ext.Annotator
import pt.ua.ieeta.rpacs.model.ext.Dataset
import rt.data.Data
import rt.plugin.service.ServiceException
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service
import rt.utils.interceptor.UserInfo

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
	def void create(String dsName, List<String> imageUIDs) {
		if (Dataset.findByName(dsName) !== null)
			throw new ServiceException(500, "Dataset with name " + dsName + " already exist!")
				
		val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
		Ebean.execute[
			val ds = new Dataset => [
				name = dsName
				annotators.add(thisAnnotator)
				images.addAll(Image.find.query.where.in('uid', imageUIDs).findList)
			]
			ds.save
		]
	}
	
	@Public(worker = true)
	@Context(name = 'user', type = UserInfo)
	def void delete(String dsName) {
		val ds = Dataset.findByName(dsName)
		if (ds === null)
			throw new ServiceException(500, "Dataset with name " + dsName + " doesn't exist!")
		
		Ebean.execute[ ds.delete ]
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
		
		val sql = '''
			select distinct dataset_id as id from dataset_annotator
			where annotator_id = (select id from annotator where name = '«thisAnnotator.name»');
		'''
		
		val query = Ebean.createSqlQuery(sql);
		
		val otherDatasets = Dataset.find.query
			.fetch('pointers')
			.where
				.notIn('id', query.findList.map[ getLong('id') ])
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