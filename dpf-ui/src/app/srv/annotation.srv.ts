
export interface ImageRef {
  id: number
  url: string
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
  allNonAnnotatedImages(): Promise<ImageRef[]>
  
  readAnnotation(id: number): Promise<Annotation>
  createAnnotation(annoInfo: Annotation): Promise<number>
  updateAnnotation(annoInfo: Annotation): Promise<void>
}
