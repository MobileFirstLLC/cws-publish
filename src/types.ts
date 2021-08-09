export interface APIResult {
    body: object
}

export class UploadResult implements APIResult {
    body: {
        uploadState: string
    }
}

export class PublishResult implements APIResult {
    body: {
        status: Array<string>
    }
}

export interface RequestResult {
    success: boolean,
    result: APIResult
}
