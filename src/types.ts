/** 3rd party library types **/
export {Credentials} from "google-auth-library/build/src/auth/credentials";

/**
 * Represents some Chrome WebStore API response.
 */
export interface APIResult {
    body: object
}

/**
 * WebStore "Items:Update" response type.
 *
 * For endpoint specs:
 * @see {@link https://developer.chrome.com/docs/webstore/webstore_api/items/update/}
 *
 * For response data:
 * @see {@link https://developer.chrome.com/docs/webstore/webstore_api/items/}
 */
export class UploadResult implements APIResult {
    body: {
        uploadState: string
    }
}

/**
 * WebStore "Items:Publish" response type.
 *
 * For endpoint specs:
 * @see {@link https://developer.chrome.com/docs/webstore/webstore_api/items/publish/}
 *
 * For response data:
 * @see {@link https://developer.chrome.com/docs/webstore/webstore_api/items/publish/#json-1}
 */
export class PublishResult implements APIResult {
    body: {
        status: Array<string>
    }
}
