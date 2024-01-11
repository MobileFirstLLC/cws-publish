#!/usr/bin/env node

/** * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome Web Store
 *
 * @description
 * Entry point for publish command
 * * * * * * * * * * * * * * * * * * * * * * * * * * */

import { OptionValues, program } from "commander";
import { publish } from "./cws";

program
  .arguments("<client_id>")
  .arguments("<client_secret>")
  .arguments("<refresh_token>")
  .arguments("<access_token>")
  .arguments("<zip_file>")
  .arguments("<extension_id>")
  .option("-t, --testers", "publish to testers")
  .action(
    (
      clientId: string,
      secret: string,
      token: string,
      accessToken: string,
      zipPath: string,
      extId: string
    ) =>
      publish(
        clientId,
        secret,
        token,
        accessToken,
        zipPath,
        extId,
        (program as OptionValues).testers
      )
  )
  .parse(process.argv);
