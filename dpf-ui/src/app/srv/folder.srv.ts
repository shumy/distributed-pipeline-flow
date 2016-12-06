
export interface FileInfo {
  name: string
  isDir: boolean

  type: string
  size?: number
}

export interface FolderManagerProxy {
  list(inPath: string): Promise<FileInfo[]>
}