#!/usr/bin/env node

/** * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome Web Store
 *
 * @description
 * Entry point for upload command
 * * * * * * * * * * * * * * * * * * * * * * * * * * */

import {program} from 'commander';
import {upload} from './cws';

program
    .arguments('<client_id>')
    .arguments('<client_secret>')
    .arguments('<refresh_token>')
    .arguments('<zip_file>')
    .arguments('<extension_id>')
    .action((
        clientId: string,
        secret: string,
        token: string,
        zipPath: string,
        extId: string
    ) => (upload(clientId, secret, token, zipPath, extId) as Promise<any>))
    .parse(process.argv);
