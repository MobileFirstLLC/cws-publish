// TODO: type this thing; may need babel?

// const {RequestResult} = require('../src/types');
// interface Server {
//     end: Function,
//     q: Function,
//     query: Function,
//     send: Function,
//     set: Function
// };

// Web store server
module.exports.MockApiServer = (response) => {
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

// Possible responses from server
module.exports.ApiResponses = {
    upload: {
        success: {ok: true, body: {uploadState: 'SUCCESS'}}, // as RequestResult
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
