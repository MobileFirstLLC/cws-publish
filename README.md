# Chrome Web Store Publish

[![NPM](https://img.shields.io/npm/v/cws-publish)](https://www.npmjs.com/package/cws-publish)
[![Build Status](https://travis-ci.com/MobileFirstLLC/cws-publish.svg?branch=master)](https://travis-ci.com/MobileFirstLLC/cws-publish)
[![Coverage Status](https://coveralls.io/repos/github/MobileFirstLLC/cws-publish/badge.svg?branch=master)](https://coveralls.io/github/MobileFirstLLC/cws-publish?branch=master)
[![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/MobileFirstLLC/cws-publish)](https://codeclimate.com/github/MobileFirstLLC/cws-publish)
[![JSDoc](https://inch-ci.org/github/MobileFirstLLC/shortcuts-for-chrome.svg?branch=master)](https://inch-ci.org/github/mobilefirstllc/cws-publish)

### This package enables uploading chrome extensions to Chrome Web Store programmatically using CI/CD pipeline.

<br/>

![img](https://raw.githubusercontent.com/MobileFirstLLC/cws-publish/master/.github/feature.jpg)

**Is this package good fit for you?** Moderate effort is required to obtain necessary authentication credentials and to configure the workflow, but the same setup
can be used across multiple projects. If your extensions are built by multiple collaborators and/or
you deploy extensions regularly, adding this package can significantly improve your 
productivity and publishing workflow.

This packages has been used successfully with travis CI and gitlab CI and should work with any 
comparable CI environment.

----

### Table of Contents

1. **[Configuration](#1-configuration)**
2. **[Parameters](#2-parameters)**
3. **[Tips and Best Practices](#3-tips-and-best-practices)**
4. **[FAQs](#4-faqs)**

---

## 1 Configuration

**1. Add package to your project**

```
npm install --save-dev cws-publish
```
<br/>

**2. Choose and configure upload behavior:**


**A) upload as a draft:**

Upload the .zip file to developer console, but DO NOT publish it yet.

```
npx cws-upload $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID>
```

**B) upload and publish immediately:**

Web store will likely still impose a review before actual release occurs; but you are not 
required to manually submit the update for release from the developer console.

```
npx cws-publish $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID>
```

**C) upload and publish to testers:**

You can only choose this option iff the extension is currently NOT published publicly.
Current state must be draft or published to testers.
Attempting to perform this operation on a public, published extension will fail.

```
npx cws-publish $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID> --testers
```

* * *

## 2 Parameters

#### Obtaining Google API Credentials

#### `$client_id`, `$client_secret`, `$refresh_token` 
 
Detailed instructions for obtaining these values are explained in this guide: **https://developer.chrome.com/webstore/using_webstore_api#beforeyoubegin**
 
 The general process is:
 1. Enable Chrome Web Store API in Google API Console 
 2. Create OAuth Credentials in Google Console - this will generate `$client id` and `$client_secret`
 3. Authorize Chrome Web Store API - from here you get the `$refresh_token`

Once you have `$client_id` `$client_secret` and `$refresh_token` **save them as environment variables in you CI project settings**. <u>**NEVER share these values with anyone or commit them to your repository!**</u>

<br/>

#### Obtaining `<ZIP_FILE>`

Generating a zip file is outside the scope of this package. It is assumed that you have already generated a zip file during previous build steps. 
Please use tools such as [extension-cli](https://github.com/MobileFirstLLC/extension-cli) for programmatic way to generate a zip file for an extension project.

Once you know the location of the zip file, update the upload/publish command and replace `<ZIP_FILE>` with path to file. 

EXAMPLE: if using Gitlab CI and the zip file is `my.zip` in a directory called `build`, the upload command would now look like this (see notes on specifying paths below):

```
npx cws-upload $client_id $client_secret $refresh_token ./build/my.zip <EXTENSION_ID>
```

**Notes on specifying paths**: 

- when using **Travis CI**, 
  the path to the release file is just the file name if zip file will be generated in the root of the repository
    
  for example: `release.zip` 

- when using **Gitlab pipeline**,
  the path the release should (must?) include explicit relative path to file, 
  
  for example: `./public/release.zip` if the zip file is generated as a build artifact in the root.


<br/>

#### Obtaining `<EXTENSION_ID>`

Go to chrome web store [developer console](https://chrome.google.com/webstore/developer/dashboard) and click "More info". Copy the item id (approx. 32 character string) and paste it to your upload/publish command to replace `<EXTENSION_ID>`.  
 
**EXAMPLE:** if your extension id is `fpggedhgeoicapmcammhdbmcmngbpkll`, the upload command would now look like this:
 
 ```
npx cws-upload $client_id $client_secret $refresh_token ./build/my.zip fpggedhgeoicapmcammhdbmcmngbpkll
 ```
  
**This completes the configuration steps.** 
 
* * *



<h3 align="center">
 Still feeling confused? <img src='https://media0.giphy.com/media/xk9cukG3p8mcv0tlli/giphy.gif' width="42" /><br/>
 <a href="https://github.com/MobileFirstLLC/cws-publish/tree/master/examples">See examples of platform-specific CI configuration scripts &rarr;</a></h3>

* * *
 
## 3 Tips and Best Practices

It often makes sense to deploy based on some condition, such as only on tagged commits.
The general idea is to use the same command, but run the command based on some conditional check.

#### Travis CI example
```
if [ ! -z  "$TRAVIS_TAG" ]; then 
    npx cws-upload $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID> 
fi    
```

#### Gitlab CI example

```
store_publish:
  stage: publish
  script:
    - npx cws-upload $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID> 
  artifacts:
    paths:
      - <ZIP_FILE>
  only:
    - tags
```

To keep your CI configuration file clutter free, you can use environment variables for all parameters, including <ZIP_FILE> and <EXTENSION_ID>

```
npx cws-upload $client_id $secret $token $zip_path $extension_id
```

## 4 FAQs

**Q1: Can I use an API key to access chrome web store API?**

No. When dealing with private user data simple API key is not enough.

**Q2: Can I use service account to access chrome web store API?**

If you have a G suite business account, you may create a 
service account to use as the identify for interacting with the API.
Assuming the service account has access to the developer dashboard in
Chrome web store this should work, although untested.

**Q3: Can I use same credentials across multiple extension projects?**

Yes

**Q4: What CI providers is this compatible with?**

Travis and Gitlab; possible others as long as they support Node.js runtime

---

#### References

[Chrome Webstore API Reference](https://developer.chrome.com/webstore/api_index)

#### License

CC0-1.0 License
