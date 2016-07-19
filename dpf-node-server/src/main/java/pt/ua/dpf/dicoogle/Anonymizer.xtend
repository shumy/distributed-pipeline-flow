package pt.ua.dpf.dicoogle

import java.nio.ByteBuffer
import org.dcm4che2.io.DicomInputStream
import java.io.ByteArrayInputStream
import org.dcm4che2.data.Tag
import java.io.ByteArrayOutputStream
import org.dcm4che2.io.DicomOutputStream

class Anonymizer {
	
	public static val (ByteBuffer) => ByteBuffer transform  = [ in |
		var transformTime = System.currentTimeMillis
		
		println('IN -> P:' + in.position + ' L:' + in.limit)
		val is = new DicomInputStream(new ByteArrayInputStream(in.array)) /* => [
			handler = new StopTagInputHandler(Tag.PixelData)
		]*/
		
		val dicomObject = try {
			is.readDicomObject
		} finally {
			is.close
			in.position(in.limit)
		}
		
		dicomObject => [
			/*val PatientName = getString(Tag.PatientName)
			val StudyInstanceUID = getString(Tag.StudyInstanceUID)
			val SeriesInstanceUID = getString(Tag.SeriesInstanceUID)
			val SOPInstanceUID = getString(Tag.SOPInstanceUID)
			
			println('''
				Patient: «PatientName»
				StudyUID: «StudyInstanceUID»
				SeriesUID: «SeriesInstanceUID»
				SopUID: «SOPInstanceUID»
			''')
			*/
			
			putString(Tag.PatientName, vrOf(Tag.PatientName), 'Anonymized-1')
		]
		
		val baos = new ByteArrayOutputStream
		val os = new DicomOutputStream(baos)
		try {
			os.writeDicomFile(dicomObject)
		} finally {
			os.close
		}
		
		val bytes = baos.toByteArray
		val out = ByteBuffer.wrap(bytes)
		out.limit(bytes.length)
		out.position(bytes.length)
		println('OUT -> P:' + out.position + ' L:' + out.limit)
		
		transformTime = System.currentTimeMillis - transformTime 
		println('Transform Time: ' + transformTime)
		
		return out
	]
}