export interface FileUploadResult {
  fileName: string
  fileUrl: string
}

export interface FileStorage {
  upload(file: File, userId: string): Promise<FileUploadResult>
}

export class UploadFileUseCase {
  constructor(private readonly storage: FileStorage) {}

  async execute(file: File, userId: string): Promise<FileUploadResult> {
    return this.storage.upload(file, userId)
  }
}
