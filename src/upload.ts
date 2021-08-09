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
    .action((a, b, c, d, e) => (upload(a, b, c, d, e) as Promise<any>))
    .parse(process.argv);
