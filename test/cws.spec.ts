/* eslint-disable no-undef,no-unused-expressions,camelcase */
// @ts-nocheck
import {ApiServer, ApiResponses} from './mocks.spec'
import * as sinon from 'sinon'
import {expect} from 'chai'
import * as request from 'superagent'
import {upload, publish} from '../dist/cws'

const fs = require('fs')
const OAuth2 = require('google-auth-library').OAuth2Client

// setup test parameters
const apiClient = 'myClientId'
const apiSecret = 'myAPISecret'
const apiToken = 'xyz'
const access_token = 'some_token'
const badZip = 'bad.zip'
const goodZip = 'good.zip'
const zipThatThrowsError = 'fail.zip'
const extensionId = 'fpggedhgeoicapmcammhdbmcmngbpkll'

describe('Chrome Web Store (CWS) Publish', function () {

    /**
     * Init test environment
     */
    beforeEach(async function () {

        // stub web store api server upload requests
        global.uploadReq = sinon.stub(request, 'put')
        global.publishReq = sinon.stub(request, 'post')

        // stub console log, file system
        sinon.stub(console, 'error')
        sinon.stub(console, 'log')
        sinon.stub(process, 'exit')
        sinon.stub(fs, 'readFileSync')

        // file system read results
        fs.readFileSync.withArgs(badZip).returns(null)
        fs.readFileSync.withArgs(zipThatThrowsError).throwsException()
        fs.readFileSync.withArgs(goodZip).returns(new Uint8Array(100))

        global.authToken = sinon.stub(OAuth2.prototype, 'refreshAccessToken')
            .yields(false, {access_token})
    })

    /**
     * Reset state after each test
     */
    afterEach(async function () {
        sinon.restore()
        global.uploadReq.restore()
        global.publishReq.restore()
        global.authToken.restore()
    })

    // Helper: Check process termination with error
    // It should log message to terminal and terminate exit code (1)
    const terminatesWithError = (message = 'displays failure') => {
        expect((console.error as any).calledOnce, message).to.equal(true)
        expect((process.exit as any).calledWith(1)).to.be.true
    }

    // Helper: Process outputs message and exists with 0 code.
    const endsWithSuccess = (n: int = 1) => {
        expect(n === 2 ?
            (console.log as any).calledTwice :
            (console.log as any).calledOnce,
            'outputs a message').to.equal(true)
        expect((process.exit as any).notCalled).to.be.true
    }

    // Helper: zip file-read was called
    const calledZipFileRead = (message = 'file read called') => {
        expect(fs.readFileSync.calledOnce, message).to.equal(true)
    }

    describe('\n\tLocal machine behaviors', function () {

        it('Missing arguments -> end with failure', async function () {
            await upload(undefined, undefined, undefined, undefined, undefined)
            terminatesWithError() // immediate failure
        })

        it('Empty file read fails -> end with failure', async function () {
            await upload(apiClient, apiSecret, apiToken, badZip, extensionId)
            calledZipFileRead()
            terminatesWithError()
        })

        it('File read error is handled -> end with failure', async function () {
            await upload(apiClient, apiSecret, apiToken, zipThatThrowsError, extensionId)
            calledZipFileRead()
            terminatesWithError()
        })

        it('If auth token not obtained -> end with failure', async function () {
            global.authToken.yields(true, undefined)
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false)
            calledZipFileRead()
            terminatesWithError()
        })
    })

    describe('\n\tFailing request scenarios', function () {

        it('Failed upload -> end with failure', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.failure))
            const token = await upload(apiClient, apiSecret, apiToken, goodZip, extensionId)
            expect(global.uploadReq.calledOnce, 'calls upload').to.equal(true)
            expect((console.log as any).notCalled, 'log output not expected').to.equal(true)
            expect(token, 'no token expected').to.be.undefined
            terminatesWithError()
        })

        it('Success upload -> failed publish -> end with failure', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success))
            global.publishReq.returns(ApiServer(ApiResponses.publish.taken_down))
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false)
            expect(global.uploadReq.calledOnce, 'calls upload').to.equal(true)
            expect((console.log as any).calledOnce, 'log output expected once').to.equal(true)
            expect(global.publishReq.calledOnce, 'calls publish').to.equal(true)
            terminatesWithError('publish fails')
        })
    })

    describe('\n\tSuccessful Requests', function () {

        beforeEach(async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success))
            global.publishReq.returns(ApiServer(ApiResponses.publish.ok))
        })

        it('Expected access token', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.success))
            const token = await upload(apiClient, apiSecret, apiToken, goodZip, extensionId)
            expect(token, 'returns expected access_token').to.equal(access_token)
            endsWithSuccess()
        })

        it('Status "In progress" counts as success', async function () {
            global.uploadReq.returns(ApiServer(ApiResponses.upload.progress))
            await upload(apiClient, apiSecret, apiToken, goodZip, extensionId)
            endsWithSuccess()
        })

        it('Successful upload', async function () {
            await upload(apiClient, apiSecret, apiToken, goodZip, extensionId)
            calledZipFileRead()
            endsWithSuccess()
        })

        it('Immediate publish', async function () {
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false)
            calledZipFileRead()
            endsWithSuccess(2)
        })

        it('Publish that requires review', async function () {
            global.publishReq.returns(ApiServer(ApiResponses.publish.review))
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, false)
            expect(global.publishReq().q.publishTarget, 'publishes to default')
                .to.equal('default')
            calledZipFileRead()
            endsWithSuccess(2)
        })

        it('Publish to testers', async function () {
            await publish(apiClient, apiSecret, apiToken, goodZip, extensionId, true)
            expect(global.publishReq().q.publishTarget, 'publishes to testers')
                .to.equal('trustedTesters')
            calledZipFileRead()
            endsWithSuccess(2)
        })
    })
})
