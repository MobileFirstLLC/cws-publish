# Chrome Web Store Publish

[![NPM](https://img.shields.io/npm/v/cws-publish)](https://www.npmjs.com/package/cws-publish)
![npm](https://img.shields.io/npm/dt/cws-publish)
[![Test](https://github.com/MobileFirstLLC/cws-publish/actions/workflows/test.yml/badge.svg)](https://github.com/MobileFirstLLC/cws-publish/actions/workflows/test.yml)
[![Coverage Status](https://img.shields.io/coveralls/github/MobileFirstLLC/cws-publish)](https://coveralls.io/github/MobileFirstLLC/cws-publish?branch=main)
[![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/MobileFirstLLC/cws-publish)](https://codeclimate.com/github/MobileFirstLLC/cws-publish)
[![node-current](https://img.shields.io/node/v/cws-publish)](https://www.npmjs.com/package/cws-publish)

**Upload chrome extensions to Chrome Web Store programmatically using CI/CD pipeline.**

<br/>

![img](https://raw.githubusercontent.com/MobileFirstLLC/cws-publish/main/.github/feature.jpg)

**Is this package a good fit for you?** Moderate effort is required to obtain necessary authentication credentials and to configure the workflow, but the same setup can be used across multiple projects. If your extensions are built by multiple collaborators and/or you deploy extensions regularly, adding this package can significantly improve your productivity and publishing workflow. This packages has been used successfully with **[Travis CI](https://www.travis-ci.com/)**, **[Gitlab CI](https://docs.gitlab.com/ee/ci/)** and **[Github actions](https://github.com/features/actions)**. It should work with any comparable CI environment that supports Node.js.

**Usage**

- **[Getting Started](#getting-started)**
- **[Configuration Examples](#ci-configuration-examples)** 
- **[FAQs](#faqs)**

## Getting Started

### Usage with GitHub Actions

1. Configure workflow, example:

   ```yaml
   - name: Upload to Chrome Web Store
     uses: mobilefirstllc/cws-publish@latest
     with:
       action: 'upload'  # one of: upload, publish, testers
       client_id: ${{ secrets.CLIENT }}
       client_secret: ${{ secrets.SECRET }}
       refresh_token: ${{ secrets.TOKEN }}
       extension_id: '32-CHAR EXTENSION ID' 
       zip_file: 'ZIP FILE PATH'
   ```
   
   Choose appropriate action based on desired behavior:
    
   | Action    | Description                                                                     |
   |:----------|:--------------------------------------------------------------------------------|
   | `upload`  | uploads zip file to developer console; manual publish from console is required  |
   | `publish` | uploads zip file and submits publish request automatically                      |
   | `testers` | uploads zip and requests publish to testers (unavailable for public extensions) |

   All parameters are required -- make sure to define them all.

3. see [obtain necessary credentials](#obtain-necessary-credentials) for instructions for specifying each parameter.

### Generic CI or CLI usage

1. Add the NPM package to your project

   ```
   npm install --save-dev cws-publish
   ```

2. **Available commands**: choose command based on desired behavior

   - **Upload draft**

     Upload the .zip file to developer console, but DO NOT publish it yet. Manual publish is still needed from developer console.

     ```
     npx cws-upload $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID>
     ```

   - **Publish immediately**

      Web store will likely still impose a review before actual release occurs; but you are not required to manually submit the update for release from the developer console.

      ```
      npx cws-publish $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID>
      ```

   - **Publish to testers only**

       You can only choose this option if the extension is currently NOT published publicly. Current state must be draft or published to testers. Attempting to perform this operation on a public published extension will fail.

       ```
       npx cws-publish $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID> --testers
       ```
     
3. see [obtain necessary credentials](#obtain-necessary-credentials) for instructions for specifying each parameter. 

## Obtain necessary credentials

All commands require defining 5 parameters. This section explains how to obtain each.

1. **Google API credentials: `$client_id`, `$client_secret`, `$refresh_token`** 
 
    Detailed instructions for obtaining these values are explained in this guide: **https://developer.chrome.com/webstore/using_webstore_api#beforeyoubegin**
    
    The general process is:
    1. Enable Chrome Web Store API in Google API Console 
    2. Create OAuth Credentials in Google Console - this will generate `$client id` and `$client_secret`
    3. Authorize Chrome Web Store API - from here you get the `$refresh_token`
    
    Once you have `$client_id` `$client_secret` and `$refresh_token` save them as environment variables in you CI project settings. <u>**NEVER share these values with anyone or commit them to your repository!**</u>

2. **Path to `<ZIP_FILE>`**

    Generating a zip file is outside the scope of this package. It is assumed that you have already generated a zip file during previous build steps. Please use tools such as [extension-cli](https://github.com/MobileFirstLLC/extension-cli) for programmatic way to generate a zip file for an extension project.

    Notes on specifying paths for different CI environments: 
    
    - when using **Travis CI** or **Github actions**, if zip file will be generated in the root of the repository, the path to the release file is the file name without path, for example: `release.zip` 
    
    - when using **Gitlab pipeline**, if the zip file is generated as a build artifact in the root, path to the release should include relative path, for example: `./public/release.zip` 
    
3. **Extension identifier `<EXTENSION_ID>`**

    Go to Chrome web store [developer console](https://chrome.google.com/webstore/developer/dashboard) and click on an existing extension. Copy the item id (32 alpha-char string) and paste it to your command to replace `<EXTENSION_ID>`. 
 
    If your extension is brand new, you must manually upload an initial draft in the developer console to obtain an id for your extension. Further, you will not be able to publish a new extension until you manually complete the store listing to include uploading necessary screenshots and consenting to their policies.

<br/>

<p align="center">
<strong>🏁 This completes configuration steps. 🏁</strong> 
</p>

## CI Configuration Examples

<strong>Feeling confused? <img src='https://media0.giphy.com/media/xk9cukG3p8mcv0tlli/giphy.gif' width="42" /></strong>

Here are complete and minimal examples of platform-specific CI configuration scripts. Each example is set
to run on tagged commits -- omit or change this condition if you prefer alternative configuration.

### Github Actions :octocat:

```yaml
name: Publish

on:
  push:
    tags:
      - '*' 

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16

      - name: Install dependencies
        run: npm install

      - name: Build zip file
        run: npm run build

      - name: Upload to Chrome Web Store
        uses: mobilefirstllc/cws-publish@latest
        with:
          action: 'upload' 
          client_id: ${{ secrets.CLIENT }}
          client_secret: ${{ secrets.SECRET }}
          refresh_token: ${{ secrets.TOKEN }}
          extension_id: ${{ secrets.EXTENSION_ID }}
          zip_file: 'release.zip'
```

### Gitlab CI :fox_face:

```yaml
image: node:latest

stages:
  - install
  - deploy

install_dependencies:
  stage: install
  script: npm install
  artifacts:
    paths:
      - node_modules/

deploy:
  stage: deploy
  script:    
    - npm run build
    - npx cws-upload $client_id $secret $token $zip_path $extension_id;
  artifacts:
    paths:
      - public/
  only:
    - tags
```

### Travis CI :construction_worker:

```yaml
language: node_js
node_js:
  - "latest"

script:
  - npm install
  - npm run build
  - if [ ! -z  "$TRAVIS_TAG" ]; then 
      npx cws-upload $client_id $secret $token $zip $extension_id;
    fi
```

## FAQs

1. **Can I use an API key to access chrome web store API?**

   No. When dealing with private user data simple API key is not enough.

2. **Can I use service account to access chrome web store API?**

   If you have a G suite business account, you may create a service account to use as the identify for interacting with the API. Assuming the service account has access to the developer dashboard in Chrome web store this should work, although untested.

3. **Can I use same credentials across multiple extension projects?**

   Yes

4. **What CI providers is this compatible with?**

   It should be compatible with any CI/CD environment that supports Node.js runtime

## References

[Chrome Webstore API Reference](https://developer.chrome.com/webstore/api_index)
