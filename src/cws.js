/** * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome Web Store
 *
 * Author: Mobile First LLC
 * Website: https://mobilefirst.me
 *
 * @description
 * Utility methods used for uploading and publishing
 * extensions through Chrome Web Store API.
 * * * * * * * * * * * * * * * * * * * * * * * * * * */

const fs = require('fs');
const request = require('superagent');
const OAuth2 = require('googleapis').google.auth.OAuth2;
const {NO_ZIP_ERR, AUTH_FAILURE} = require('./dict.json');

/**
 * @description Check that api response contains expected success indicator
 * @param {Object} res - full response
 * @param {String} key - response property indicating success
 * @param {String} value - expected success value
 */
const checkApiResponse = (res, key, value) =>
    (!!(res && res.ok && res.body && res.body[key] === value))

/**
 * @description Determine if upload response indicates it succeeded
 * @param {Object} res - response details
 */
const uploadSuccess = (res) => checkApiResponse(res, 'uploadState', 'SUCCESS');

/**
 * @description Determine if publish response indicates it succeeded
 * @param {Object} res - response details
 */
const publishSuccess = (res) => checkApiResponse(res, 'status', 'OK');

/**
 * @description read file from disk as a blob
 * @param {String} filepath
 */
const getFileBlob = filepath => {
    try {
        return fs.readFileSync(filepath);
    } catch (e) {
        return null
    }
};

/**
 * @description Try to get access token.
 *
 * The authorization must have been granted in advance
 * for users own application. Here we attempt to get
 * refresh token for offline access.
 *
 * @param {String} refresh_token - use oauth2 refresh token
 * @param {String} client_id - application client_id - from google API console
 * @param {String} client_secret - application secret - from google API console
 * @returns {Promise}
 */
const getAccessToken = (refresh_token, client_id, client_secret) =>
    new Promise((resolve) => {
        const oauth2Client = new OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
        oauth2Client.setCredentials({access_token: null, refresh_token});
        oauth2Client.refreshAccessToken((err, tokens) =>
            resolve(err || !tokens || !tokens.access_token ? null : tokens.access_token));
    });

/**
 * @description Upload file to chrome web store
 * @param {String} extension_id
 * @param {Blob} blob - zip file data
 * @param {String} access_token
 * @returns {Promise}
 */
const uploadFile = (extension_id, blob, access_token) =>
    new Promise(resolve => request
        .put('https://www.googleapis.com/upload/chromewebstore/v1.1/items/' + extension_id)
        .query({uploadType: 'media'})
        .set({'Authorization': 'Bearer ' + access_token})
        .send(blob)
        .end((error, result) => resolve([!error && uploadSuccess(result), result])));

/**
 * @description Publish extension
 * @param {String} extension_id
 * @param {String} access_token
 * @param {boolean} beta - set `true` to publish to testers; else publish to everyone
 * Note that publish to testers will be rejected if the extension is already published
 * publicly; you must un-publish first.
 * @returns {Promise}
 */
const publishExtension = (extension_id, access_token, beta) =>
    new Promise(resolve => request
        .post(`https://www.googleapis.com/chromewebstore/v1.1/items/${extension_id}/publish`)
        .query({publishTarget: beta ? 'trustedTesters' : 'default'})
        .set({'Authorization': 'Bearer ' + access_token})
        .end((err, res) => resolve([!err && publishSuccess(res), res])));

/**
 * @description Display result of some workflow task
 * @param {boolean} success - task succeeded / failed
 * @param {String|Object} result - success or error details
 */
const handleResult = (success, result) => {
    const {body} = (typeof result !== 'object') ? {body: result} : result;

    if (success) console.log(body);
    else console.error(body);
};

/**
 * @description Upload file to chrome web store
 * @param {String} apiClientId - googleapi client id
 * @param {String} apiSecret - google api secret
 * @param {String} apiToken - google api refresh token
 * @param {String} zipPath - path to extension zip file
 * @param {String} extensionId - extension id
 * first param is access token if token was successfully refreshed
 */
const upload = async (apiClientId, apiSecret, apiToken, zipPath, extensionId) => {
    const onStepFail = msg => {
        handleResult(false, msg);
        return undefined;
    }
    // read file
    const blob = getFileBlob(zipPath);
    if (!blob) return onStepFail(NO_ZIP_ERR);

    // obtain access token
    const accessToken = await getAccessToken(apiToken, apiClientId, apiSecret);
    if (!accessToken) return onStepFail(AUTH_FAILURE);

    // upload to store
    const [success, result] = await uploadFile(extensionId, blob, accessToken);
    if (!success) return onStepFail(result);

    handleResult(success, result);
    return accessToken;
};

/**
 * @description Publish extension
 * @param {String} apiClientId - googleapi client id
 * @param {String} apiSecret - google api secret
 * @param {String} apiToken - google api refresh token
 * @param {String} zipPath - path to extension zip file
 * @param {String} extensionId - extension id
 * @param {boolean} testers - publish to testers
 */
const publish = async (apiClientId, apiSecret, apiToken, zipPath, extensionId, testers) => {
    const accessToken = await upload(apiClientId, apiSecret, apiToken, zipPath, extensionId);
    if (accessToken) {
        const [success, result] = await publishExtension(extensionId, accessToken, testers);
        handleResult(success, result);
    }
    return accessToken;
};

/** PUBLIC METHODS **/
module.exports.upload = upload;
module.exports.publish = publish;
