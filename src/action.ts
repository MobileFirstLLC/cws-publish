/** * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome Web Store
 *
 * @description
 * GitHub Action entry point and handler
 * * * * * * * * * * * * * * * * * * * * * * * * * * */

import * as core from "@actions/core";
import { publish, upload } from "./cws";

const action = (
  core.getInput("action", { required: true }) || ""
).toLowerCase();
const clientId = core.getInput("client_id", { required: false });
const secret = core.getInput("client_secret", { required: false });
const token = core.getInput("refresh_token", { required: false });
const accessToken = core.getInput("access_token", { required: false });
const zip = core.getInput("zip_file", { required: true });
const extId = core.getInput("extension_id", { required: true });

switch (action) {
  case "upload":
    upload(clientId, secret, token, accessToken, zip, extId)
      .then((_) => core.info("Upload to webstore completed"))
      .catch((error) => core.setFailed(error.message));
    break;
  case "publish":
    publish(clientId, secret, token, accessToken, zip, extId, false)
      .then((_) => core.info("Publish to webstore completed"))
      .catch((error) => core.setFailed(error.message));
    break;
  case "testers":
    publish(clientId, secret, token, accessToken, zip, extId, true)
      .then((_) => core.info("Publish webstore testers completed"))
      .catch((error) => core.setFailed(error.message));
    break;
  default:
    core.setFailed(
      "Failed with error: unknown value for parameter action. " +
        "Specify one of: upload, publish, testers."
    );
}
