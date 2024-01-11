/**
 * @description
 * Utility methods used for uploading and publishing
 * extensions through Chrome Web Store API.
 */

import {
  APIResult,
  Credentials,
  Dictionary,
  PublishResult,
  UploadResult,
} from "./types";

import { OAuth2Client } from "google-auth-library";
// @ts-ignore
import * as request from "superagent";

const fs = require("fs");

const dictionary: Dictionary = {
  zipError: "FATAL: zip file not found or not readable",
  authError:
    "FATAL: authentication failed. At least 1 of arguments: client_id, client_secret, refresh_token; is invalid.",
};

/**
 * @description Check that API response contains response body.
 * @param {APIResult} response - response from WebStore API
 */
const checkApiResponse = (response: APIResult) => !!(response && response.body);

/**
 * @description Determine if upload succeeded based on uploadState.
 * @param {UploadResult} response - Upload response from WebStore API
 */
const uploadSuccess = (response: UploadResult) =>
  checkApiResponse(response) &&
  (response.body.uploadState === "SUCCESS" ||
    response.body.uploadState === "IN_PROGRESS");

/**
 * @description Determine if publish succeeded based on status.
 * @param {PublishResult} response - publish response from WebStore API
 */
const publishSuccess = (response: PublishResult) =>
  checkApiResponse(response) &&
  Array.isArray(response.body.status) &&
  (response.body.status.includes("OK") ||
    response.body.status.includes("ITEM_PENDING_REVIEW"));

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
 * @param {string} refreshToken - use oauth2 refresh token
 * @param {string} clientId - application clientId - from google API console
 * @param {string} clientSecret - application secret - from google API console
 * @returns {Promise<string|undefined>} - if request succeed this method returns access token, and undefined otherwise.
 */
const getAccessToken = (
  refreshToken: string,
  clientId: string,
  clientSecret: string
) =>
  new Promise((resolve) => {
    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      "urn:ietf:wg:oauth:2.0:oob"
    );
    oauth2Client.setCredentials({
      access_token: null,
      refresh_token: refreshToken,
    });
    oauth2Client.refreshAccessToken(
      (err: object | null, credentials: Credentials | null) =>
        resolve(!err && credentials ? credentials.access_token : undefined)
    );
  });

/**
 * @description Upload file to chrome web store
 * @param {string} extensionId - Chrome extension ID
 * @param {Blob} blob - zip file data as a Blob
 * @param {string} accessToken - WebStore API access token
 * @returns {Promise<[boolean, UploadResult]>} - response succeeded (flag), response from WebStore API.
 */
const uploadFile = (extensionId: string, blob: Blob, accessToken: string) =>
  new Promise((resolve) =>
    request
      .put(
        "https://www.googleapis.com/upload/chromewebstore/v1.1/items/" +
          extensionId
      )
      .query({ uploadType: "media" })
      .set({ Authorization: "Bearer " + accessToken })
      .send(blob)
      .end((e: boolean, r: UploadResult) => resolve([e, r]))
  );

/**
 * @description Publish extension
 * @param {string} extensionId - Chrome extension ID
 * @param {string} accessToken - WebStore API access token
 * @param {boolean} beta - set `true` to publish to testers; else publish to everyone
 * Note that publish to testers will be rejected if the extension is already published
 * publicly; you must un-publish first.
 * @returns {Promise<[boolean, PublishResult]>} - response succeeded (flag), response from WebStore API.
 */
const publishExtension = (
  extensionId: string,
  accessToken: string,
  beta: boolean
) =>
  new Promise((resolve) =>
    request
      .post(
        `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`
      )
      .query({ publishTarget: beta ? "trustedTesters" : "default" })
      .set({ Authorization: "Bearer " + accessToken })
      .end((e: boolean, r: UploadResult) => resolve([e, r]))
  );

/**
 * @description Display result of some workflow task
 * @param {boolean} success - task succeeded / failed
 * @param {string|APIResult} result - success or failure details
 */
const handleResult = (success: boolean, result: string | APIResult) => {
  const msg = typeof result === "object" ? result.body : result;

  if (success) console.log(msg);
  else {
    console.error(msg);
    process.exit(1);
  }
};

/**
 * @description Upload file to Chrome web store
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
  apiAccessToken: string,
  zipPath: string,
  extensionId: string
) => {
  let accessToken;

  // read file
  const blob = getFileBlob(zipPath);
  if (!blob) return handleResult(false, dictionary.zipError);

  if (!apiAccessToken) {
    // obtain access token
    accessToken = (await getAccessToken(
      apiToken,
      apiClientId,
      apiSecret
    )) as string;
  } else {
    accessToken = apiAccessToken;
  }
  if (!accessToken) return handleResult(false, dictionary.authError);

  // upload to store
  const [error, result] = (await uploadFile(
    extensionId,
    blob,
    accessToken
  )) as [boolean, UploadResult];
  const success = !error && uploadSuccess(result);
  handleResult(success, result);

  return success ? accessToken : undefined;
};

/**
 * @description Publish extension
 * @param {string} apiClientId - google api client id
 * @param {string} apiSecret - google api secret
 * @param {string} apiToken - google api refresh token
 * @param {string} apiAccessToken - google api access token
 * @param {string} zipPath - path to extension zip file
 * @param {string} extensionId - extension id
 * @param {boolean} testers - publish to testers
 * @returns {Promise<void>} - undefined
 */
export const publish = async (
  apiClientId: string,
  apiSecret: string,
  apiToken: string,
  apiAccessToken: string,
  zipPath: string,
  extensionId: string,
  testers: boolean
) => {
  let accessToken;
  if (!apiAccessToken) {
    // upload zip file
    accessToken = await upload(
      apiClientId,
      apiSecret,
      apiToken,
      apiAccessToken,
      zipPath,
      extensionId
    );
  } else {
    accessToken = apiAccessToken;
  }

  // if upload succeeds, proceed to publish
  if (accessToken) {
    const [error, result] = (await publishExtension(
      extensionId,
      accessToken,
      testers
    )) as [boolean, PublishResult];
    handleResult(!error && publishSuccess(result), result);
  }
};
