package pt.ua.dpf.srv

import rt.data.Data
import rt.plugin.service.an.Service
import rt.async.promise.Promise
import java.util.List
import rt.plugin.service.an.Public
import rt.plugin.service.an.Context
import rt.utils.interceptor.UserInfo
import rt.async.AsyncUtils
import pt.ua.ieeta.rpacs.model.ext.Annotator
import java.util.Collections
import pt.ua.ieeta.rpacs.model.ext.Dataset
import com.avaje.ebean.Ebean

@Data
@Service
class DatasetService {
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Promise<List<DatasetInfo>> myDatasets() {
		AsyncUtils.task[
			val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
			if (thisAnnotator === null)
				return Collections.EMPTY_LIST
			
			return thisAnnotator.dataset.map[ ds |
				DatasetInfo.B => [
					id = ds.id
					name = ds.name
					size = ds.images.size
					progress = ds.images.filter[ annotations.findFirst[ annotator == thisAnnotator ] !== null ].size
					isDefault = ds === thisAnnotator.currentDataset
				]
			]
		]
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Promise<Void> setMyDefault(Long defaultId) {
		AsyncUtils.task[
			Ebean.execute[
				val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
				val defDs = thisAnnotator.dataset.findFirst[ id === defaultId ]
				if (defDs !== null) {
					thisAnnotator.currentDataset = defDs
					thisAnnotator.save
				}
				return null
			]
		]
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Promise<Void> subscribe(List<Long> ids) {
		AsyncUtils.task[
			Ebean.execute[
				val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
				val subscriptions = Dataset.find.query.where.idIn(ids).findList
				thisAnnotator.dataset.addAll(subscriptions)
				
				thisAnnotator.save
				return null
			]
		]
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Promise<List<DatasetInfo>> otherDatasets() {
		AsyncUtils.task[
			val thisAnnotator = Annotator.getOrCreateAnnotator(user.name)
			val allDatasets = Dataset.find.all
			
			val Iterable<Dataset> filteredDs = if (thisAnnotator === null) allDatasets else {
				allDatasets.filter[ !thisAnnotator.dataset.contains(it) ]
			}
			
			return filteredDs.map[ ds |
				DatasetInfo.B => [
					id = ds.id
					name = ds.name
					size = ds.images.size
					progress = 0
					isDefault = ds.isIsDefault 
				]
			].toList
		]
	}
}

//id: 2, name: 'my-xpto', size: 15, progress: 8, default: true
@Data
class DatasetInfo {
	Long id
	String name
	Integer size
	Integer progress
	Boolean isDefault
}