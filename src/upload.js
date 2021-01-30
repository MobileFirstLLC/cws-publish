#!/usr/bin/env node

/** * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome
 * Web Store
 *
 * Author: Mobile First LLC
 * Website: https://mobilefirst.me
 *
 * @description
 * Entry point for upload command
 * * * * * * * * * * * * * * * * * * * * */

const program = require('commander');
const cws = require('./cws');

program
    .arguments('<client_id>')
    .arguments('<client_secret>')
    .arguments('<refresh_token>')
    .arguments('<zip_file>')
    .arguments('<extension_id>')
    .action(cws.upload)
    .parse(process.argv);
