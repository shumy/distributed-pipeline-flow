
export interface ImageRef {
  id: number
  url: string
  preloaded?: boolean
}

export interface ImageDataset {
	total: number
	images: ImageRef[]
}

export interface Annotation {
  id: number
  image: number
  
  quality: string
  local: string

  retinopathy: string
  maculopathy: string
  photocoagulation: string
}

export interface AnnotationService {
  currentDatasetNonAnnotatedImages(): Promise<ImageDataset>
  
  readAnnotation(id: number): Promise<Annotation>
  createAnnotation(annoInfo: Annotation): Promise<number>
  updateAnnotation(annoInfo: Annotation): Promise<void>
}
