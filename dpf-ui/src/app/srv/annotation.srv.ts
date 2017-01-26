
export interface AnnotationService {
  allNonAnnotatedImages(): Promise<number[]>
  
  readAnnotation(id: number): Promise<any>
  createAnnotation(annoInfo: any): Promise<number>
  updateAnnotation(annoInfo: any): Promise<void>
}