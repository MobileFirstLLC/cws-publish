#!/usr/bin/env node

/** * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome Web Store
 *
 * @description
 * Entry point for upload command
 * * * * * * * * * * * * * * * * * * * * * * * * * * */

import { program } from "commander";
import { upload } from "./cws";

program
  .arguments("<client_id>")
  .arguments("<client_secret>")
  .arguments("<refresh_token>")
  .arguments("<access_token>")
  .arguments("<zip_file>")
  .arguments("<extension_id>")
  .action(
    (
      clientId: string,
      secret: string,
      token: string,
      accessToken: string,
      zipPath: string,
      extId: string
    ) =>
      upload(
        clientId,
        secret,
        token,
        accessToken,
        zipPath,
        extId
      ) as Promise<any>
  )
  .parse(process.argv);
