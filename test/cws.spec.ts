const fs = require('fs');
import {ApiServer, ApiResponses} from './mocks.spec';
const OAuth2 = require('googleapis').google.auth.OAuth2;
// @ts-ignore
import * as sinon from 'sinon';
// @ts-ignore
import {expect} from 'chai';
// @ts-ignore
import * as request from 'superagent';
// @ts-ignore
import {upload, publish} from "../dist/cws";

const apiClient = 'myClientId',
    apiSecret = 'myAPISecret',
    apiToken = 'xyz',
    access_token = 'some_token',
    badZip = 'bad.zip',
    goodZip = 'good.zip',
    zipThatThrowsError = 'fail.zip',
    extensionId = 'fpggedhgeoicapmcammhdbmcmngbpkll';

describe('Chrome Web Store (CWS) Publish', function () {

    beforeEach(async function () {

        // stub web store api server upload request
        // @ts-ignore
        global.uploadReq = sinon.stub(request, 'put');
        // @ts-ignore
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
        // @ts-ignore
        global.uploadReq.restore();
        // @ts-ignore
        global.publishReq.restore();
    });

    describe('\n\tFailing behavior', function () {
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
    });

    describe('\n\tFailing requests', function () {

        beforeEach(async function () {
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token});
        });

        afterEach(async function () {
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('Failed upload request terminates process with failure', async function () {
            // @ts-ignore
            global.uploadReq.returns(ApiServer(ApiResponses.upload.failure));
            const token = await upload(apiClient, apiSecret, apiToken, goodZip, extensionId);
            // @ts-ignore
            expect(global.uploadReq.calledOnce, 'calls upload').to.equal(true);
            expect((console.log as any).notCalled, 'does not display success').to.equal(true);
            expect((console.error as any).calledOnce, 'displays failure').to.equal(true);
            expect(token, 'does not return token when upload fails').to.be.undefined;
            expect((process.exit as any).calledWith(1)).to.be.true;
        });

        it('Successful upload followed by failing publish fails', async function () {
            // @ts-ignore
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success));
            // @ts-ignore
            global.publishReq.returns(ApiServer(ApiResponses.publish.taken_down));
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false);
            // @ts-ignore
            expect(global.uploadReq.calledOnce, 'calls upload').to.equal(true);
            expect((console.log as any).calledOnce, 'second request fails').to.equal(true);
            // @ts-ignore
            expect(global.publishReq.calledOnce, 'proceeds to calls publish').to.equal(true);
            expect((console.error as any).calledOnce, 'second request fails').to.equal(true);
            expect((process.exit as any).calledWith(1)).to.be.true;
        });
    });

    describe('\n\tSuccessful Requests', function () {

        beforeEach(async function () {
            // @ts-ignore
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success));
            // @ts-ignore
            global.publishReq.returns(ApiServer(ApiResponses.publish.ok));
            sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token});
        });

        afterEach(async function () {
            OAuth2.prototype.refreshAccessToken.restore();
        });

        it('"In progress" counts as success', async function () {
            // @ts-ignore
            global.uploadReq.returns(ApiServer(ApiResponses.upload.progress));
            const token = await upload(apiClient, apiSecret, apiToken, goodZip, extensionId);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(token, 'returns expected access_token').to.equal(access_token);
            expect((console.log as any).calledOnce, 'outputs response to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });

        it('Successful upload', async function () {
            await upload(apiClient, apiSecret, apiToken, goodZip, extensionId);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect((console.log as any).calledOnce, 'outputs 1 good response to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });

        it('Immediate publish', async function () {
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect((console.log as any).calledTwice, 'outputs 2 good responses to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });

        it('Publish that requires review', async function () {
            // @ts-ignore
            global.publishReq.returns(ApiServer(ApiResponses.publish.review));
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            // @ts-ignore
            expect(global.publishReq().q.publishTarget, 'publishes to default').to.equal('default');
            expect((console.log as any).calledTwice, 'outputs 2 good responses to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });

        it('Publish to testers', async function () {
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, true);
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            // @ts-ignore
            expect(global.publishReq().q.publishTarget, 'publishes to testers').to.equal('trustedTesters');
            expect((console.log as any).calledTwice, 'outputs 2 good responses to console').to.equal(true);
            expect((process.exit as any).notCalled).to.be.true;
        });
    });
});
