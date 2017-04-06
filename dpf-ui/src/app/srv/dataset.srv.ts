
export interface DatasetInfo {
  id: number
	name: string
	size: number
	isDefault: boolean
  pointers: { [type: string]: PointerInfo }
  selected?: boolean
}

export interface PointerInfo {
  type: string
	last: number
	next: number
}

export interface ImageRef {
  id: number
  url: string
  loaded?: boolean
}

export interface DatasetService {
  myDefault(): Promise<DatasetInfo>
  setMyDefault(id: number): Promise<void>
  getImageRefsFromDefault(offset: number, limit: number): Promise<ImageRef[]>

  myDatasets(): Promise<DatasetInfo[]>
  otherDatasets(): Promise<DatasetInfo[]>
  subscribe(id: number[]): Promise<void>
}