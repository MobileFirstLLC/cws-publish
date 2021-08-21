import {APIResult, PublishResult, UploadResult} from "../src/types";

interface SuperAgentRequest {
    q: object,
    end: Function,
    query: Function,
    send: Function,
    set: Function
}

// Mock superagent and web store server
export const ApiServer = (result: APIResult) => {
    const superAgent: SuperAgentRequest = {
        q: undefined,
        send: () => superAgent,
        set: () => superAgent,
        end: (cb: Function) => cb(false, result),
        query: (q: object) => {
            superAgent.q = q;
            return superAgent;
        },
    };
    return superAgent
};

// Possible responses from server
export const ApiResponses = {
    upload: {
        success: {body: {uploadState: 'SUCCESS'}} as UploadResult,
        progress: {body: {uploadState: 'IN_PROGRESS'}} as UploadResult,
        failure: {body: {uploadState: 'FAILURE'}} as UploadResult,
        notfound: {body: {uploadState: 'NOT_FOUND'}} as UploadResult,
    },
    publish: {
        ok: {body: {status: ['OK']}} as PublishResult,
        review: {body: {status: ['ITEM_PENDING_REVIEW']}} as PublishResult,
        invalid_dev: {body: {status: ['INVALID_DEVELOPER']}} as PublishResult,
        not_owner: {body: {status: ['DEVELOPER_NO_OWNERSHIP']}} as PublishResult,
        suspended_dev: {body: {status: ['DEVELOPER_SUSPENDED']}} as PublishResult,
        taken_down: {body: {status: ['ITEM_TAKEN_DOWN']}} as PublishResult,
        suspended_publisher: {body: {status: ['PUBLISHER_SUSPENDED']}} as PublishResult,
        notfound: {body: {status: ['ITEM_NOT_FOUND']}} as PublishResult,
        unauthorized: {body: {status: ['NOT_AUTHORIZED']}} as PublishResult,
    }
};
