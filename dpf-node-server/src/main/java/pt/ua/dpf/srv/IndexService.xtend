package pt.ua.dpf.srv

import java.io.File
import java.util.List
import java.util.Set
import rt.async.observable.Observable
import rt.data.Data
import rt.data.Default
import rt.data.Validation
import rt.pipeline.UserInfo
import rt.plugin.service.an.Context
import rt.plugin.service.an.Public
import rt.plugin.service.an.Service

@Data
@Service
class IndexService {
	val String folder
	@Default('false') val boolean isHomeManager
	
	public transient var (List<File>) => Observable<File> indexer = null
	public transient var (File) => void onFileIndexed = null
	
	@Validation
	def construct() {
		val fFolder = new File(folder)
		if (!fFolder.exists) fFolder.mkdirs
	}
	
	@Public
	@Context(name = 'user', type = UserInfo)
	def Observable<String> indexFiles(Set<String> files) {
		val path = user.theFolder
		val fPath = new File(path)
		
		val dcmFiles = fPath.listFiles.filter[ files.contains(name) ].toList
		if (indexer !== null)
			indexer.apply(dcmFiles)
				.forEach[ file | onFileIndexed?.apply(file) ]
				.map[ name ]
	}
	
	private def String theFolder(UserInfo user) {
		val theFolder = if (!isHomeManager) folder else folder + '/' + user.name
		val fFolder = new File(theFolder)
		if (!fFolder.exists) fFolder.mkdirs
		
		return theFolder
	}
}