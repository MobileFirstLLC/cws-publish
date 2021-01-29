#!/usr/bin/env node

const program = require('commander');
const cws = require('./cws');

program
    .arguments('<client_id>')
    .arguments('<client_secret>')
    .arguments('<refresh_token>')
    .arguments('<zip_file>')
    .arguments('<extension_id>')
    .option('-t, --testers', 'publish to testers')
    .action((a, b, c, d, e) => {
        cws.publish(a, b, c, d, e, program.testers)
    })
    .parse(process.argv);
