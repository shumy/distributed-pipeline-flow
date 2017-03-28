
export interface DatasetInfo {
  id: number
	name: string
	size: number
	progress: number
	isDefault: boolean
  selected?: boolean
}

export interface DatasetProxy {
  myDatasets(): Promise<DatasetInfo[]>
  setMyDefault(id: number): Promise<void>
  subscribe(id: number[]): Promise<void>

  otherDatasets(): Promise<DatasetInfo[]>
}