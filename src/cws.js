/** * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome
 * Web Store
 *
 * Author: Mobile First LLC
 * Website: https://mobilefirst.me
 *
 * @description
 * Utility methods used for uploading and
 * publishing extensions through Chrome
 * Web Store API
 * * * * * * * * * * * * * * * * * * * * */

const qio_fs = require('q-io/fs');
const request = require('superagent');
const OAuth2 = require('googleapis').google.auth.OAuth2;
const {NO_ZIP_ERR, AUTH_FAILURE} = require('./dict.json');

/**
 * @description Check that api response contains expected success indicator
 * @param {Object} res - full response
 * @param {String} key - response property indicating success
 * @param {String} value - expected success value
 */
const checkApiResponse = (res, key, value) => {
    return !!(res && res.ok && res.body && res.body[key] === value)
};

/**
 * @description Determine if upload response indicates it succeeded
 * @param {Object} res - response details
 */
const uploadSuccess = (res) => {
    return checkApiResponse(res, 'uploadState', 'SUCCESS');
};

/**
 * @description Determine if publish response indicates it succeeded
 * @param {Object} res - response details
 */
const publishSuccess = (res) => {
    return checkApiResponse(res, 'status', 'OK');
};

/**
 * @description read file from disk as blob
 * @param {String} filepath
 * @param {function} callback
 */
const getFileBlob = (filepath, callback) => {
    qio_fs.read(filepath, 'b')
        .then(callback)
        .catch(() => callback(null));
};

/**
 * @description Try to get access token - the authorization must have been granted in advance
 * for users own application. Here we are just trying to refresh the token for offline access.
 * @param {String} refresh_token - use oauth2 refresh token
 * @param {String} client_id - application client_id - from google api console
 * @param {String} client_secret - application secret - from google api console
 * @param {*} callback
 */
const getAccessToken = (
    refresh_token,
    client_id,
    client_secret,
    callback) => {
    const oauth2Client = new OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
    const _tokens = {
        access_token: null,
        refresh_token: refresh_token
    };
    oauth2Client.setCredentials(_tokens);
    oauth2Client.refreshAccessToken((err, tokens) => {
        if (err || !tokens || !tokens.access_token) {
            callback(null);
        } else {
            callback(tokens.access_token);
        }
    });
};

/**
 * @description Upload file to chrome web store
 * @param {String} extension_id
 * @param {Blob} blob - file data
 * @param {String} access_token
 * @param {function} callback
 */
const uploadFile = (
    extension_id,
    blob,
    access_token,
    callback) => {
    request
        .put('https://www.googleapis.com/upload/chromewebstore/v1.1/items/' + extension_id)
        .query({uploadType: 'media'})
        .set({'Authorization': 'Bearer ' + access_token})
        .send(blob)
        .end((err, res) => {
            callback(!err && uploadSuccess(res), res);
        });
};

/**
 * @description Publish extension
 * @param {String} extension_id
 * @param {String} access_token
 * @param {boolean} beta - set `true` to publish to testers; else publish to everyone
 * Note that publish to testers will be rejected if the extension is already published
 * publically; you must first unpublish
 * @param {function} callback
 */
const publishExtension = (
    extension_id,
    access_token,
    beta,
    callback) => {
    request
        .post('https://www.googleapis.com/chromewebstore/v1.1/items/' + extension_id + '/publish')
        .query({publishTarget: beta ? 'trustedTesters' : 'default'})
        .set({'Authorization': 'Bearer ' + access_token})
        .end((err, res) => {
            callback(!err && publishSuccess(res), res);
        });
};

/**
 * @description Steps to do after task has completed:
 * 1. if some task has failed, log output
 * 2. then, if callback is defined, call callback with data
 * @param {boolean} success - task succeeded / failed
 * @param {String|Object} res - error details
 * @param {function?} callback - function to call after task completes
 * @param {*} data - data to pass to callback function if defined
 */
const handleResult = (
    success,
    res,
    callback,
    data) => {
    const logger = success ? console.log : console.error;

    res = (typeof res !== 'object') ? {body: res} : res;
    logger(res.body);

    return !callback || (typeof callback !== "function") || callback(data);
};

/**
 * @description Upload file to chrome web store
 * @param {String} cid - googleapi client id
 * @param {String} secret - google api secret
 * @param {String} token - google api refresh token
 * @param {String} zip - path to extension zip file
 * @param {String} eid - extension id
 * @param {function} callback - function to call upon completion;
 * first param is access token if token was successfully refreshed
 */
const upload = (
    cid,
    secret,
    token,
    zip,
    eid,
    callback) => {
    const stepFailed = (msg) => handleResult(false, msg, callback);

    const step1 = cb => {
        getFileBlob(zip, blob => {
            return blob ? cb(blob) : stepFailed(NO_ZIP_ERR);
        })
    };

    const step2 = cb => {
        getAccessToken(token, cid, secret, (access_token) => {
            access_token ? cb(access_token) : stepFailed(AUTH_FAILURE);
        });
    };

    const step3 = (blob, access_token) => {
        uploadFile(eid, blob, access_token, (success, res) => {
            handleResult(success, res, callback, access_token);
        });
    };

    step1(blob => step2(access_token => {
        step3(blob, access_token)
    }));
};

/**
 * @description Publish extension
 * @param {String} cid - googleapi client id
 * @param {String} secret - google api secret
 * @param {String} token - google api refresh token
 * @param {String} zip - path to extension zip file
 * @param {String} eid - extension id
 * @param {boolean} testers - publish to testers
 * @param {function} callback - function to call upon completion
 */
const publish = (
    cid,
    secret,
    token,
    zip,
    eid,
    testers,
    callback) => {
    upload(cid, secret, token, zip, eid, (access_token) => {
        if (access_token) {
            return publishExtension(eid, access_token, testers,
                (s, r) => handleResult(s, r, callback));
        }
        return !callback || callback();
    });
};

//=====================
//  PUBLIC METHODS  ↓↓↓
//=====================

module.exports.upload = upload;
module.exports.publish = publish;
