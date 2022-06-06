/** * * * * * * * * * * * * * * * * * * * * * * * * * *
 * CWS-publish
 * CI packages for publishing in Chrome Web Store
 *
 * @description
 * Github Action entry point and handler
 * * * * * * * * * * * * * * * * * * * * * * * * * * */

import * as core from '@actions/core'
import { upload, publish } from './cws'

const action = (core.getInput('action', { required: true }) || '').toLowerCase()
const clientId = core.getInput('client_id', { required: true })
const secret = core.getInput('client_secret', { required: true })
const token = core.getInput('refresh_token', { required: true })
const zip = core.getInput('zip_file', { required: true })
const extId = core.getInput('extension_id', { required: true })

switch (action) {
  case 'upload':
    upload(clientId, secret, token, zip, extId)
      .then(_ => core.info('Upload to webstore completed'))
      .catch(error => core.setFailed(error.message))
    break
  case 'publish':
    publish(clientId, secret, token, zip, extId, false)
      .then(_ => core.info('Publish to webstore completed'))
      .catch(error => core.setFailed(error.message))
    break
  case 'testers':
    publish(clientId, secret, token, zip, extId, true)
      .then(_ => core.info('Publish webstore testers completed'))
      .catch(error => core.setFailed(error.message))
    break
  default:
    core.setFailed('Failed with error: unknown valur for parameter action. ' +
            'Specify one of: upload, publish, testers.')
}
