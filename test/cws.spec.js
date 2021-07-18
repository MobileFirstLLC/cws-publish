const fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    OAuth2 = require('googleapis').google.auth.OAuth2,
    request = require('superagent'),
    cws = require('../src/cws'),
    clientId = "myClientId",
    secret = "myAPISecret",
    apiToken = "xyz",
    goodZip = 'good.zip',
    extensionId = 'fpggedhgeoicapmcammhdbmcmngbpkll';

describe('Chrome Web Store (CWS) Publish', function () {

    let uploadReq, publishReq;

    beforeEach(async function () {
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
        fs.readFileSync.withArgs(goodZip).returns(new Uint8Array(100));
        fs.readFileSync.withArgs('bad.zip').returns(null);
        fs.readFileSync.withArgs('error.zip').throwsException();
    });

    afterEach(async function () {
        console.error.restore();
        console.log.restore();
        fs.readFileSync.restore();
        uploadReq.restore();
        publishReq.restore();
    });

    describe('\nERROR BEHAVIOR', function () {
        it('Fails on missing arguments', async function () {
            await cws.upload(undefined, undefined, undefined, undefined, undefined);
            expect(console.error.calledOnce, 'outputs error to console').to.equal(true);
        });

        it('Failed file read terminates process early', async function () {
            await cws.upload(clientId, secret, apiToken, 'bad.zip', extensionId);
            expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
            expect(console.error.calledOnce, 'displays error').to.equal(true);
        });

        it('File read error is handled and terminates', async function () {
            await cws.upload(clientId, secret, apiToken, 'error.zip', extensionId)
            expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
            expect(console.error.calledOnce, 'displays error').to.equal(true);
        });

        it('Failure to obtain auth token logs error', async function () {
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(true, undefined);
            await cws.publish(clientId, secret, apiToken, goodZip, extensionId, false)
            expect(fs.readFileSync.calledOnce, 'file read succeeded').to.equal(true);
            expect(console.error.calledOnce, 'displays error').to.equal(true);
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('Failed upload request logs error', async function () {
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'fail'});
            await cws.upload(clientId, secret, apiToken, goodZip, extensionId)
            expect(console.error.calledOnce, 'displays error').to.equal(true);
            OAuth2.prototype.refreshAccessToken.restore();
        });
    });

    describe('\nSUCCESSFUL REQUESTS', function () {

        beforeEach(async function () {
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'some_token'});
        });

        afterEach(async function () {
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('Successful upload', async function () {
            const token = await cws.upload(clientId, secret, apiToken, goodZip, extensionId)
            expect(token, 'access_token').to.equal('some_token');
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledOnce, 'outputs 1 good response to console').to.equal(true);
        });

        it('Successful publish', async function () {
            await cws.publish(clientId, secret, apiToken, goodZip, extensionId, false)
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledTwice, 'outputs two good responses to console').to.equal(true);
        });

        it('Publish to testers', async function () {
            await cws.publish(clientId, secret, apiToken, goodZip, extensionId, true)
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledTwice, 'outputs two good responses to console').to.equal(true);
        });
    });
});
