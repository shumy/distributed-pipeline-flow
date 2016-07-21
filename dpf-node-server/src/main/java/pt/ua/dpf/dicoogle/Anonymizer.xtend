package pt.ua.dpf.dicoogle

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.util.Random
import java.util.UUID
import org.dcm4che2.data.Tag
import org.dcm4che2.io.DicomInputStream
import org.dcm4che2.io.DicomOutputStream

class Anonymizer {
	
	public static val (ByteBuffer) => ByteBuffer transform  = [ in |
		var transformTime = System.currentTimeMillis
		
		val is = new DicomInputStream(new ByteArrayInputStream(in.array))
		val dicomObject = try {
			is.readDicomObject
		} finally {
			is.close
			in.position(in.limit)
		}
		
		dicomObject => [
			val REMOVE_MATCHING_KEYS = #[
				Tag.ReferringPhysicianAddress,
				Tag.ReferringPhysicianTelephoneNumbers,
				Tag.StationName,
				Tag.StudyDescription,
				Tag.SeriesDescription,
				Tag.InstitutionalDepartmentName,
				Tag.PhysiciansOfRecord,
				Tag.PerformingPhysicianName,
				Tag.NameOfPhysiciansReadingStudy,
				Tag.OperatorsName,
				Tag.AdmittingDiagnosesDescription,
				Tag.DerivationDescription,
				Tag.MedicalRecordLocator,
				Tag.EthnicGroup,
				Tag.Occupation,
				Tag.AdditionalPatientHistory,
				Tag.PatientComments,
				Tag.ProtocolName,
				Tag.ImageComments,
				Tag.RequestAttributesSequence,
				Tag.ContentSequence
			]

			val UID_MATCHING_KEYS = #[
				Tag.InstanceCreatorUID,
				Tag.SOPInstanceUID,
				Tag.ReferencedSOPInstanceUID,
				Tag.StudyInstanceUID,
				Tag.SeriesInstanceUID,
				Tag.FrameOfReferenceUID,
				Tag.SynchronizationFrameOfReferenceUID,
				Tag.UID,
				Tag.StorageMediaFileSetUID,
				Tag.ReferencedFrameOfReferenceUID,
				Tag.RelatedFrameOfReferenceUID
			]
			
			val OVERWRITE_MATCHING_KEYS = #[
				Tag.InstitutionName,
				Tag.InstitutionAddress,
				Tag.ReferringPhysicianName,
				Tag.PatientBirthDate,
				Tag.PatientBirthTime,
				Tag.PatientSex,
				Tag.OtherPatientIDs,
				Tag.OtherPatientNames,
				Tag.PatientAge,
				Tag.PatientSize,
				Tag.PatientWeight,
				Tag.DeviceSerialNumber
			]
			
			// PatientID removed from List
			val OTHER_MATCHING_KEY = #[
				Tag.AccessionNumber,
				Tag.StudyID
			]
			
			for (tag: UID_MATCHING_KEYS) {
				putString(tag, vrOf(tag), UUID.randomUUID.toString)
			}
			
			for (tag: OVERWRITE_MATCHING_KEYS) {
				if (dicomObject.containsValue(tag) && dicomObject.contains(tag)) {
					putString(tag, vrOf(tag), '')
				}
			}
			
			for (tag: REMOVE_MATCHING_KEYS) {
				if (dicomObject.containsValue(tag) && dicomObject.contains(tag)) {
					remove(tag)
				}
			}
			
			for (tag: OTHER_MATCHING_KEY) {
				if (dicomObject.containsValue(tag) && dicomObject.contains(tag)) {
					putString(tag, vrOf(tag), new Random().nextInt(1000).toString)
				}
			}

			putString(Tag.PatientName, vrOf(Tag.PatientName), 'JohnDoe')
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
		
		transformTime = System.currentTimeMillis - transformTime 
		println('Transform Time: ' + transformTime)
		
		return out
	]
}