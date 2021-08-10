const fs = require('fs');
const OAuth2 = require('googleapis').google.auth.OAuth2;
import {expect} from 'chai';
import * as request from 'superagent';
import * as sinon from 'sinon';
import {ApiServer, ApiResponses} from './mocks.spec';
import {upload, publish} from "../src/cws";

const apiClient = 'myClientId',
    apiSecret = 'myAPISecret',
    apiToken = 'xyz',
    badZip = 'bad.zip',
    goodZip = 'good.zip',
    zipThatThrowsError = 'fail.zip',
    extensionId = 'fpggedhgeoicapmcammhdbmcmngbpkll';

describe('Chrome Web Store (CWS) Publish', function () {

    beforeEach(async function () {

        // stub web store api server upload request
        global.uploadReq = sinon.stub(request, 'put');
        global.publishReq = sinon.stub(request, 'post');

        // stub console log, file system
        sinon.stub(console, 'error');
        sinon.stub(console, 'log');
        sinon.stub(process, 'exit');
        sinon.stub(fs, 'readFileSync');

        // file system read results
        fs.readFileSync.withArgs(goodZip).returns(new Uint8Array(100));
        fs.readFileSync.withArgs(badZip).returns(null);
        fs.readFileSync.withArgs(zipThatThrowsError).throwsException();
    });

    afterEach(async function () {
        sinon.restore();
    });

    describe('\nError behavior', function () {

        it('Fails on missing arguments', async function () {
            await upload(undefined, undefined, undefined, undefined, undefined);
            expect((console.error as any).calledOnce, 'outputs failure to console').to.equal(true);
            expect((process.exit as any).calledWith(1)).to.be.true;
        });

        it('Failed file read terminates process with failure', async function () {
            await upload(apiClient, apiSecret, apiToken, badZip, extensionId);
            expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
            expect((console.error as any).calledOnce, 'displays failure').to.equal(true);
            expect((process.exit as any).calledWith(1)).to.be.true;
        });

        it('File read failure is handled and terminates process with failure', async function () {
            await upload(apiClient, apiSecret, apiToken, zipThatThrowsError, extensionId);
            expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
            expect((console.error as any).calledOnce, 'displays failure').to.equal(true);
            expect((process.exit as any).calledWith(1)).to.be.true;
        });

        it('Failure to obtain auth token terminates process with failure', async function () {
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(true, undefined);
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false);
            expect(fs.readFileSync.calledOnce, 'file read succeeded').to.equal(true);
            expect((console.error as any).calledOnce, 'displays failure').to.equal(true);
            expect((process.exit as any).calledWith(1)).to.be.true;
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('Failed upload request terminates process with failure', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.failure));
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'fail'});
            await upload(apiClient, apiSecret, apiToken, goodZip, extensionId);
            expect((console.error as any).calledOnce, 'displays failure').to.equal(true);
            expect((process.exit as any).calledWith(1)).to.be.true;
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('Successful upload followed by failing publish fails', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success));
            global.publishReq.returns(ApiServer(ApiResponses.publish.taken_down));
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'some_token'});
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false);
            expect((console.log as any).calledOnce, 'first request succeeds').to.equal(true);
            expect((console.error as any).calledOnce, 'second request fails').to.equal(true);
            expect((process.exit as any).calledWith(1)).to.be.true;
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
            global.uploadReq.returns(ApiServer(ApiResponses.upload.progress));
            const token = await upload(apiClient, apiSecret, apiToken, goodZip, extensionId);
            expect(token, 'access_token').to.equal('some_token');
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect((console.log as any).calledOnce, 'outputs 1 good response to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });

        it('Successful upload', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success));
            await upload(apiClient, apiSecret, apiToken, goodZip, extensionId);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect((console.log as any).calledOnce, 'outputs 1 good response to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });

        it('Immediate publish', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success));
            global.publishReq.returns(ApiServer(ApiResponses.publish.ok));
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect((console.log as any).calledTwice, 'outputs two good responses to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });

        it('Publish that requires review', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success));
            global.publishReq.returns(ApiServer(ApiResponses.publish.review));
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, true);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect((console.log as any).calledTwice, 'outputs two good responses to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });

        it('Publish to testers', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success));
            global.publishReq.returns(ApiServer(ApiResponses.publish.ok));
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, true);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(global.publishReq().q().publishTarget, 'publishes to testers').to.equal('trustedTesters');
            expect((console.log as any).calledTwice, 'outputs two good responses to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });
    });
});
