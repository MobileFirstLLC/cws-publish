/**
 * @description
 * Utility methods used for uploading and publishing
 * extensions through Chrome Web Store API.
 */


const fs = require('fs');
import {Credentials, APIResult, UploadResult, PublishResult, Dictionary} from './types'

// @ts-ignore
import * as request from 'superagent';
import {google} from 'googleapis';

const dictionary: Dictionary = {
    zipError: 'FATAL: zip file not found or not readable',
    authError: 'FATAL: authentication failed. At least 1 of arguments: client_id, client_secret, refresh_token; is invalid.'
}

/**
 * @description Check that API response contains response body.
 * @param {APIResult} response - response from WebStore API
 */
const checkApiResponse = (response: APIResult) => !!(response && response.body);

/**
 * @description Determine if upload succeeded based on uploadState.
 * @param {UploadResult} response - Upload response from WebStore API
 */
const uploadSuccess = (response: UploadResult) => checkApiResponse(response) &&
    (response.body.uploadState === 'SUCCESS' || response.body.uploadState === 'IN_PROGRESS');

/**
 * @description Determine if publish succeeded based on status.
 * @param {PublishResult} response - publish response from WebStore API
 */
const publishSuccess = (response: PublishResult) =>
    checkApiResponse(response) && Array.isArray(response.body.status) &&
    (response.body.status.includes('OK') || response.body.status.includes('ITEM_PENDING_REVIEW'));

/**
 * @description read file from disk as a blob.
 * @param {string} filepath - path to zip file on disk
 */
const getFileBlob = (filepath: string) => {
    try {
        return fs.readFileSync(filepath);
    } catch (e) {
        return null;
    }
};

/**
 * @description Try to get access token. Authorization must have been granted in advance
 * for user's own application. This method attempts to get refresh token for offline access.
 *
 * @param {string} refresh_token - use oauth2 refresh token
 * @param {string} client_id - application client_id - from google API console
 * @param {string} client_secret - application secret - from google API console
 * @returns {Promise<string|undefined>} - if request succeed this method returns access token, and undefined otherwise.
 */
const getAccessToken = (refresh_token: string, client_id: string, client_secret: string) =>
    new Promise((resolve) => {
        const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
        oauth2Client.setCredentials({access_token: null, refresh_token});
        oauth2Client.refreshAccessToken((
            err: object | null, credentials: Credentials | null
        ) => resolve(!err && credentials ? credentials.access_token : undefined));
    });

/**
 * @description Upload file to chrome web store
 * @param {string} extension_id - Chrome extension ID
 * @param {Blob} blob - zip file data as a Blob
 * @param {string} access_token - WebStore API access token
 * @returns {Promise<[boolean, UploadResult]>} - response succeeded (flag), response from WebStore API.
 */
const uploadFile = (extension_id: string, blob: Blob, access_token: string) =>
    new Promise(resolve => request
        .put('https://www.googleapis.com/upload/chromewebstore/v1.1/items/' + extension_id)
        .query({uploadType: 'media'})
        .set({Authorization: 'Bearer ' + access_token})
        .send(blob)
        .end((e: boolean, r: UploadResult) => resolve([e, r])));

/**
 * @description Publish extension
 * @param {string} extension_id - Chrome extension ID
 * @param {string} access_token - WebStore API access token
 * @param {boolean} beta - set `true` to publish to testers; else publish to everyone
 * Note that publish to testers will be rejected if the extension is already published
 * publicly; you must un-publish first.
 * @returns {Promise<[boolean, PublishResult]>} - response succeeded (flag), response from WebStore API.
 */
const publishExtension = (extension_id: string, access_token: string, beta: boolean) =>
    new Promise(resolve => request
        .post(`https://www.googleapis.com/chromewebstore/v1.1/items/${extension_id}/publish`)
        .query({publishTarget: beta ? 'trustedTesters' : 'default'})
        .set({Authorization: 'Bearer ' + access_token})
        .end((e: boolean, r: UploadResult) => resolve([e, r])));

/**
 * @description Display result of some workflow task
 * @param {boolean} success - task succeeded / failed
 * @param {string|APIResult} result - success or failure details
 */
const handleResult = (success: boolean, result: string | APIResult) => {
    const msg = typeof result === 'object' ? result.body : result;

    if (success) console.log(msg);
    else {
        console.error(msg);
        process.exit(1);
    }
};

/**
 * @description Upload file to chrome web store
 * @param {string} apiClientId - google api client id
 * @param {string} apiSecret - google api secret
 * @param {string} apiToken - google api refresh token
 * @param {string} zipPath - path to extension zip file
 * @param {string} extensionId - extension id
 * @returns {Promise<string|undefined>} - access token if successful, and undefined otherwise
 */
export const upload = async (
    apiClientId: string,
    apiSecret: string,
    apiToken: string,
    zipPath: string,
    extensionId: string
) => {
    // read file
    const blob = getFileBlob(zipPath);
    if (!blob) return handleResult(false, dictionary.zipError);

    // obtain access token
    const accessToken = (await getAccessToken(apiToken, apiClientId, apiSecret)) as string;
    if (!accessToken) return handleResult(false, dictionary.authError);

    // upload to store
    const [error, result] = (await uploadFile(extensionId, blob, accessToken)) as [boolean, UploadResult];
    const success = !error && uploadSuccess(result);
    handleResult(success, result);

    return success ? accessToken : undefined;
};

/**
 * @description Publish extension
 * @param {string} apiClientId - google api client id
 * @param {string} apiSecret - google api secret
 * @param {string} apiToken - google api refresh token
 * @param {string} zipPath - path to extension zip file
 * @param {string} extensionId - extension id
 * @param {boolean} testers - publish to testers
 * @returns {Promise<void>} - undefined
 */
export const publish = async (
    apiClientId: string,
    apiSecret: string,
    apiToken: string,
    zipPath: string,
    extensionId: string,
    testers: boolean
) => {
    // upload zip file
    const accessToken = await upload(apiClientId, apiSecret, apiToken, zipPath, extensionId);

    // if upload succeeds, proceed to publish
    if (accessToken) {
        const [error, result] = (await publishExtension(extensionId, accessToken, testers)) as [boolean, PublishResult];
        handleResult(!error && publishSuccess(result), result);
    }
};

