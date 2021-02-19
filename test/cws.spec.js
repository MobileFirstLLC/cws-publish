let
    fs = require('fs'),
    sinon = require('sinon'),
    expect = require('chai').expect,
    OAuth2 = require('googleapis').google.auth.OAuth2,
    request = require('superagent'),
    cws = require('../src/cws');

describe('CWS Publish', function () {

    let uploadReq, publishReq;

    before(function () {

        // stub webstore api upload request
        uploadReq = sinon.stub(request, 'put');
        uploadReq.returns((function () {
            let module = {};

            module.set = () => {
                return module;
            };
            module.send = () => {
                return module;
            };
            module.query = () => {
                return module;
            };

            module.end = (cb) => {
                return cb(null, {ok: true, body: {"uploadState": "SUCCESS"}})
                // : cb(null, {ok: false, body: {"uploadState": "HARD PASS"}});
            };
            return module;
        }()));

        // stub webstore api publish request
        publishReq = sinon.stub(request, 'post');
        publishReq.returns((function () {
            let module = {}, query;

            module.set = () => {
                return module;
            };
            module.query = (q) => {
                query = q;
                return module;
            };
            module.end = (cb) => {
                cb(null, {ok: true, body: {"status": "OK", query: query}});
            };
            return module;
        }()));

    });

    beforeEach(function () {
        // spy console outputs
        sinon.spy(console, 'error');
        sinon.spy(console, 'log');

        sinon.stub(fs, 'readFileSync');
        fs.readFileSync.withArgs('good.zip').resolves(new Uint8Array(100));
        fs.readFileSync.withArgs('bad.zip').rejects(null);

    });

    afterEach(function () {
        console.error.restore();
        console.log.restore();
        fs.readFileSync.restore();
    });

    after(function () {
        uploadReq.restore();
        publishReq.restore();
    });

    it('failing file read terminates process early', function (done) {
        cws.upload(null, null, null, 'bad.zip', null, () => {
            expect(fs.readFileSync.calledOnce, 'file read called').to.equal(true);
            expect(console.error.calledOnce, 'outputs error to console').to.equal(true);
            done();
        });
    });

    it('failing authentication', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(true, null);
        cws.publish('1', '2', '3', 'good.zip', 'xyz', false, (access_token) => {
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(access_token, 'access_token').to.equal(undefined);
            expect(console.error.calledOnce, 'outputs auth error').to.equal(true);
            OAuth2.prototype.refreshAccessToken.restore();
            done();
        });
    });

    it('successful upload', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'hello_there'});
        cws.upload('1', '2', '3', 'good.zip', 'xyz', (access_token) => {
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(access_token, 'access_token').to.equal('hello_there');
            expect(console.log.calledOnce, 'outputs webstore api response to console').to.equal(true);

            OAuth2.prototype.refreshAccessToken.restore();
            done();
        });
    });

    it('successful publish', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'some_token'});
        cws.publish('1', '2', '3', 'good.zip', 'xyz', false, () => {
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledTwice, 'outputs webstore api response to console').to.equal(true);

            OAuth2.prototype.refreshAccessToken.restore();
            done();
        });
    });

    it('publish to testers', function (done) {
        sinon.stub(OAuth2.prototype, 'refreshAccessToken').yields(false, {access_token: 'some_token'});
        cws.publish('1', '2', '3', 'good.zip', 'xyz', true, () => {
            expect(fs.readFileSync.calledOnce, 'file read succeeds').to.equal(true);
            expect(console.log.calledTwice, 'outputs webstore api response to console').to.equal(true);

            OAuth2.prototype.refreshAccessToken.restore();
            done();
        });
    });

});
