#!/usr/bin/env node

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
