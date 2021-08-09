// TODO: This test suite is not actually typed, just called .ts. maybe missing deps?
// TODO: figure out how to get sinon methods to work in ts

const fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    OAuth2 = require('googleapis').google.auth.OAuth2,
    request = require('superagent'),
    cws = require('../dist/cws'),
    clientId = 'myClientId',
    secret = 'myAPISecret',
    apiToken = 'xyz',
    goodZip = 'good.zip',
    extensionId = 'fpggedhgeoicapmcammhdbmcmngbpkll';

// Mock web store server
const MockApiServer = (response) => {
    let _query, module = {
        end(cb) {
            cb(response.ok !== true, response)
        },
        q() {
            return _query;
        },
        query(q) {
            _query = q;
            return module;
        },
        send() {
            return module
        },
        set() {
            return module
        }
    };
    return module;
};

// possible responses from server
const ApiResponses = {
    upload: {
        success: {ok: true, body: {uploadState: 'SUCCESS'}},
        progress: {ok: true, body: {uploadState: 'IN_PROGRESS'}},
        failure: {ok: false, body: {uploadState: 'FAILURE'}},
        notfound: {ok: false, body: {uploadState: 'NOT_FOUND'}}
    },
    publish: {
        ok: {ok: true, body: {status: ['OK']}},
        review: {ok: true, body: {status: ['ITEM_PENDING_REVIEW']}},
        invalid_dev: {ok: false, body: {status: ['INVALID_DEVELOPER']}},
        not_owner: {ok: false, body: {status: ['DEVELOPER_NO_OWNERSHIP']}},
        suspended_dev: {ok: false, body: {status: ['DEVELOPER_SUSPENDED']}},
        taken_down: {ok: false, body: {status: ['ITEM_TAKEN_DOWN']}},
        suspended_publisher: {ok: false, body: {status: ['PUBLISHER_SUSPENDED']}},
        notfound: {ok: false, body: {status: ['ITEM_NOT_FOUND']}},
        unauthorized: {ok: false, body: {status: ['NOT_AUTHORIZED']}},
    }
};

describe('Chrome Web Store (CWS) Publish', function () {

    beforeEach(async function () {

        global.uploadResponse = undefined;
        global.publishResponse = undefined;

        // stub web store api server upload request
        global.uploadReq = sinon.stub(request, 'put');
        global.publishReq = sinon.stub(request, 'post');

        // stub console outputs
        sinon.stub(console, 'error');
        sinon.stub(console, 'log');

        // stub system exit
        sinon.stub(process, 'exit');

        // stub readFile
        sinon.stub(fs, 'readFileSync');
        fs.readFileSync.withArgs(goodZip).returns(new Uint8Array(100));
        fs.readFileSync.withArgs('bad.zip').returns(null);
        fs.readFileSync.withArgs('failure.zip').throwsException();
    });

    afterEach(async function () {
        console.error.restore();
        console.log.restore();
        process.exit.restore();
        fs.readFileSync.restore();
        global.uploadResponse = undefined;
        global.publishResponse = undefined;
        global.uploadReq.restore();
        global.publishReq.restore();
    });

    describe('\nError behavior', function () {
        it('Fails on missing arguments', async function () {
            await cws.upload(undefined, undefined, undefined, undefined, undefined);
            expect(console.error.calledOnce, 'outputs failure to console').to.equal(true);
            expect(process.exit.calledWith(1)).to.be.true;
        });

        it('Failed file read terminates process with failure', async function () {
            await cws.upload(clientId, secret, apiToken, 'bad.zip', extensionId);
            expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
            expect(console.error.calledOnce, 'displays failure').to.equal(true);
            expect(process.exit.calledWith(1)).to.be.true;
        });

        it('File read failure is handled and terminates process with failure', async function () {
            await cws.upload(clientId, secret, apiToken, 'failure.zip', extensionId);
            expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
            expect(console.error.calledOnce, 'displays failure').to.equal(true);
            expect(process.exit.calledWith(1)).to.be.true;
        });

        it('Failure to obtain auth token terminates process with failure', async function () {
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(true, undefined);
            await cws.publish(clientId, secret, apiToken, goodZip, extensionId, false);
            expect(fs.readFileSync.calledOnce, 'file read succeeded').to.equal(true);
            expect(console.error.calledOnce, 'displays failure').to.equal(true);
            expect(process.exit.calledWith(1)).to.be.true;
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('Failed upload request terminates process with failure', async function () {
            global.uploadReq.returns(MockApiServer(ApiResponses.upload.failure));
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'fail'});
            await cws.upload(clientId, secret, apiToken, goodZip, extensionId);
            expect(console.error.calledOnce, 'displays failure').to.equal(true);
            expect(process.exit.calledWith(1)).to.be.true;
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('Successful upload followed by failing publish fails', async function () {
            global.uploadReq.returns(MockApiServer(ApiResponses.upload.success));
            global.publishReq.returns(MockApiServer(ApiResponses.publish.taken_down));
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'some_token'});
            await cws.publish(clientId, secret, apiToken, goodZip, extensionId, false);
            expect(console.log.calledOnce, 'first request succeeds').to.equal(true);
            expect(console.error.calledOnce, 'second request fails').to.equal(true);
            expect(process.exit.calledWith(1)).to.be.true;
            OAuth2.prototype.refreshAccessToken.restore();
        });
    });

    describe('\nSuccessful requests', function () {

        beforeEach(async function () {
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'some_token'});
        });

        afterEach(async function () {
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('OK if result is "In progress"', async function () {
            global.uploadReq.returns(MockApiServer(ApiResponses.upload.progress));
            const token = await cws.upload(clientId, secret, apiToken, goodZip, extensionId);
            expect(token, 'access_token').to.equal('some_token');
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledOnce, 'outputs 1 good response to console').to.equal(true);
            expect(process.exit.notCalled).to.be.true;
        });

        it('Successful upload', async function () {
            global.uploadReq.returns(MockApiServer(ApiResponses.upload.success));
            await cws.upload(clientId, secret, apiToken, goodZip, extensionId);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledOnce, 'outputs 1 good response to console').to.equal(true);
            expect(process.exit.notCalled).to.be.true;
        });

        it('Immediate publish', async function () {
            global.uploadReq.returns(MockApiServer(ApiResponses.upload.success));
            global.publishReq.returns(MockApiServer(ApiResponses.publish.ok));
            await cws.publish(clientId, secret, apiToken, goodZip, extensionId, false);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledTwice, 'outputs two good responses to console').to.equal(true);
            expect(process.exit.notCalled).to.be.true;
        });

        it('Publish that requires review', async function () {
            global.uploadReq.returns(MockApiServer(ApiResponses.upload.success));
            global.publishReq.returns(MockApiServer(ApiResponses.publish.review));
            await cws.publish(clientId, secret, apiToken, goodZip, extensionId, true);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledTwice, 'outputs two good responses to console').to.equal(true);
            expect(process.exit.notCalled).to.be.true;
        });

        it('Publish to testers', async function () {
            global.uploadReq.returns(MockApiServer(ApiResponses.upload.success));
            global.publishReq.returns(MockApiServer(ApiResponses.publish.ok));
            await cws.publish(clientId, secret, apiToken, goodZip, extensionId, true);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(global.publishReq().q().publishTarget, 'publishes to testers').to.equal('trustedTesters');
            expect(console.log.calledTwice, 'outputs two good responses to console').to.equal(true);
            expect(process.exit.notCalled).to.be.true;
        });
    });
});
