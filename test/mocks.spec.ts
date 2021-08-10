import {PublishResult, RequestResult, UploadResult} from "../src/types";

interface NetworkRequest {
    q: Function,
    end: Function,
    query: Function,
    send: Function,
    set: Function
}

// Mock superagent and web store server
export const ApiServer = ({success, result}: RequestResult) => {
    let _query: string;
    let _superAgent: NetworkRequest = {
        end: (cb: Function) => cb(!success, result),
        q: () => _query,
        send: () => _superAgent,
        set: () => _superAgent,
        query: (q: string) => {
            _query = q;
            return _superAgent;
        },
    };
    return _superAgent
};

// Possible responses from server
export const ApiResponses = {
    upload: {
        success: {
            success: true, result: {body: {uploadState: 'SUCCESS'}} as UploadResult
        } as RequestResult,
        progress: {
            success: true, result: {body: {uploadState: 'IN_PROGRESS'}} as UploadResult
        } as RequestResult,
        failure: {
            success: false, result: {body: {uploadState: 'FAILURE'}} as UploadResult
        } as RequestResult,
        notfound: {
            success: false, result: {body: {uploadState: 'NOT_FOUND'}} as UploadResult
        } as RequestResult
    },
    publish: {
        ok: {
            success: true, result: {body: {status: ['OK']}} as PublishResult
        } as RequestResult,
        review: {
            success: true, result: {body: {status: ['ITEM_PENDING_REVIEW']}} as PublishResult
        } as RequestResult,
        invalid_dev: {
            success: false, result: {body: {status: ['INVALID_DEVELOPER']}} as PublishResult
        } as RequestResult,
        not_owner: {
            success: false, result: {body: {status: ['DEVELOPER_NO_OWNERSHIP']}} as PublishResult
        } as RequestResult,
        suspended_dev: {
            success: false, result: {body: {status: ['DEVELOPER_SUSPENDED']}} as PublishResult
        } as RequestResult,
        taken_down: {
            success: false, result: {body: {status: ['ITEM_TAKEN_DOWN']}} as PublishResult
        } as RequestResult,
        suspended_publisher: {
            success: false, result: {body: {status: ['PUBLISHER_SUSPENDED']}} as PublishResult
        } as RequestResult,
        notfound: {
            success: false, result: {body: {status: ['ITEM_NOT_FOUND']}} as PublishResult
        } as RequestResult,
        unauthorized: {
            success: false, result: {body: {status: ['NOT_AUTHORIZED']}} as PublishResult
        } as RequestResult,
    }
};
