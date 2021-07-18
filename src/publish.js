#!/usr/bin/env node

/** * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome Web Store
 *
 * Author: Mobile First LLC
 * Website: https://mobilefirst.me
 *
 * @description
 * Entry point for publish command
 * * * * * * * * * * * * * * * * * * * * * * * * * * */

const program = require('commander');
const cws = require('./cws');

program
    .arguments('<client_id>')
    .arguments('<client_secret>')
    .arguments('<refresh_token>')
    .arguments('<zip_file>')
    .arguments('<extension_id>')
    .option('-t, --testers', 'publish to testers')
    .action((a, b, c, d, e) => cws.publish(a, b, c, d, e, program.testers))
    .parse(process.argv);
