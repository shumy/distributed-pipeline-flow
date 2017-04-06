
export interface AnnotationInfo {
	imageId: number
	nodes: { [type: string]: NodeInfo }
}

export interface NodeInfo {
	id?: number
	type: string
	fields: any
}

export interface AnnotationService {
  readAnnotation(imageId: number): Promise<AnnotationInfo>
  saveAnnotation(annoInfo: AnnotationInfo): Promise<void>
}
