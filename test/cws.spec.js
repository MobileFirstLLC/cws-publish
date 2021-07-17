const
    fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    OAuth2 = require('googleapis').google.auth.OAuth2,
    request = require('superagent'),
    cws = require('../src/cws'),
    clientId = "myClientId",
    secret = "myAPISecret",
    apiToken = "xyz",
    extensionId = 'fpggedhgeoicapmcammhdbmcmngbpkll';

describe('Web Store Publish', function () {

    let uploadReq, publishReq;

    beforeEach(function () {
        // stub web store api server upload request
        uploadReq = sinon.stub(request, 'put');
        uploadReq.returns((function () {
            let module = {}, success = false;
            module.set = obj => {
                // simulate remote server error by specifying failing auth token
                success = obj.Authorization && obj.Authorization.indexOf('fail') < 0;
                return module;
            };
            module.send = _ => (module);
            module.query = _ => (module);
            module.end = cb =>
                cb(success ? null : 'error', {
                    ok: success,
                    body: {uploadState: success ? "SUCCESS" : "ERROR"}
                })
            return module;
        })());

        // stub web store api server publish request
        publishReq = sinon.stub(request, 'post');
        publishReq.returns((function () {
            let module = {}, query;
            module.set = _ => (module)
            module.query = q => {
                query = q;
                return module;
            };
            module.end = cb => cb(null, {ok: true, body: {status: "OK", query}});
            return module;
        }()));

        // spy console outputs
        sinon.spy(console, 'error');
        sinon.spy(console, 'log');

        // stub readFile
        sinon.stub(fs, 'readFileSync');
        fs.readFileSync.withArgs('good.zip').resolves(new Uint8Array(100));
        fs.readFileSync.withArgs('bad.zip').resolves(null);
        fs.readFileSync.withArgs('error.zip').throwsException();
    });

    afterEach(function () {
        console.error.restore();
        console.log.restore();
        fs.readFileSync.restore();
        uploadReq.restore();
        publishReq.restore();
    });

    it('Failed file read terminates process early', function (done) {
        cws.upload(clientId, secret, apiToken, 'bad.zip', extensionId)
            .then(() => {
                expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
                expect(console.error.calledOnce, 'outputs error to console').to.equal(true);
                done();
            });
    });

    it('File read error is caught', function (done) {
        cws.upload(clientId, secret, apiToken, 'error.zip', extensionId)
            .then(() => {
                expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
                expect(console.error.calledOnce, 'outputs error to console').to.equal(true);
                done();
            });
    });

    it('Failed authentication logs error', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(true, undefined);
        cws.publish(clientId, secret, apiToken, 'good.zip', extensionId, false)
            .then(accessToken => {
                expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
                expect(accessToken, 'token').to.equal(undefined);
                expect(console.error.calledOnce, 'outputs auth error').to.equal(true);
                OAuth2.prototype.refreshAccessToken.restore();
                done();
            });
    });

    it('Failed upload logs error', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'fail'});
        cws.upload(clientId, secret, apiToken, 'good.zip', extensionId)
            .then(() => {
                expect(console.error.calledOnce, 'outputs web store api response to console').to.equal(true);
                OAuth2.prototype.refreshAccessToken.restore();
                done();
            });
    });

    it('Successful upload', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'hello_there'});
        cws.upload(clientId, secret, apiToken, 'good.zip', extensionId)
            .then(token => {
                expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
                expect(token, 'access_token').to.equal('hello_there');
                expect(console.log.calledOnce, 'outputs web store api response to console').to.equal(true);
                OAuth2.prototype.refreshAccessToken.restore();
                done();
            });
    });

    it('Successful publish', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'some_token'});
        cws.publish(clientId, secret, apiToken, 'good.zip', extensionId, false)
            .then(token => {
                expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
                expect(token, 'access_token').to.equal('some_token');
                expect(console.log.calledTwice, 'outputs two web store api responses to console').to.equal(true);
                OAuth2.prototype.refreshAccessToken.restore();
                done();
            });
    });

    it('Publish to testers', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'some_token'});
        cws.publish(clientId, secret, apiToken, 'good.zip', 'xyz', true)
            .then(() => {
                expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
                expect(console.log.calledTwice, 'outputs two web store api responses to console').to.equal(true);
                OAuth2.prototype.refreshAccessToken.restore();
                done();
            });
    });
});
