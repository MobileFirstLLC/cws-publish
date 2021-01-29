# CWS Publish

[![Build Status](https://travis-ci.com/MobileFirstLLC/cws-publish.svg?branch=master)](https://travis-ci.com/MobileFirstLLC/cws-publish)
[![Coverage Status](https://coveralls.io/repos/github/MobileFirstLLC/cws-publish/badge.svg?branch=master)](https://coveralls.io/github/MobileFirstLLC/cws-publish?branch=master)
![npm](https://img.shields.io/npm/v/cws-publish)

### This package enables uploading chrome extensions (`.zip` files) to Chrome Web Store using continuous integration.

This packages has been used successfully with travis CI and gitlab CI and should work with any 
comparable CI environment.

----

##### Table of Contents
1. [Usage](#1-usage)
2. [Parameters](#2-parameters)
3. [Advanced Usage](#3-advanced-usage)
4. [Random Notes](#4-notes)

---

## 1 Usage

**1. Add package to your project**

```
npm install --save-dev cws-publish
```
<br/>

**2. Choose your upload behavior**

There are 3 available options:

A.  Upload extension as a draft<br/> 
B.  Upload and publish extension immediately<br/>
C.  Upload and publish extension to testers (*iff* your extension is currently NOT published)

<br/>

**3. Configure your upload behavior:**


A) upload as a draft:

```
npx cws-upload $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID>
```

B) upload and release:

```
npx cws-publish $client_id $client_secret $refresh_token <ZIP_FILE> <EXTENSION_ID>
```

C) upload and release to testers:

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

Generating a zip file is outside the scope of this package. It is assumed that you have already generated a zip file during previous build steps. Please see for example [gulp-zip](https://www.npmjs.com/package/gulp-zip) for instructions if necessary. 

Once you know the location of the zip file, update the upload/publish command and replace `<ZIP_FILE>` with path to file. 

EXAMPLE: if the zip file is `my.zip` in a directory called `build`, the upload command would now look like this:

```
npx cws-upload $client_id $client_secret $refresh_token ./build/my.zip <EXTENSION_ID>
```

<br/>

#### Obtaining `<EXTENSION_ID>`

Go to chrome web store [developer console](https://chrome.google.com/webstore/developer/dashboard) and click "More info". Copy the item id (approx. 32 character string) and paste it to your upload/publish command to replace `<EXTENSION_ID>`.  
 
**EXAMPLE:** if your extension id is `fpggedhgeoicapmcammhdbmcmngbpkll`, the upload command would now look like this:
 
 ```
npx cws-upload $client_id $client_secret $refresh_token ./build/my.zip fpggedhgeoicapmcammhdbmcmngbpkll
 ```
  
**This completes the configuration steps.** 
 
* * *
 
## 3 Advanced Usage

**Deploy based on some condition, such as only on tagged commits.** 

The general idea is to use the same command, but run the command based on conditional check

#### Travis CI example
```
  - if [ ! -z  "$TRAVIS_TAG" ]; then 
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

**To keep your CI configuration file clutter free, you can use environment variables for all parameters, including <ZIP_FILE> and <EXTENSION_ID>**

```$xslt
npx cws-upload $client_id $secret $token $zip_path $extension_id
```

* * *

## 4 Notes

**Q1: Can I use an API key to access chrome web store API?**

No. When dealing with private user data simple API key will not suffice.

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

[Chrome Webstore Api Reference](https://developer.chrome.com/webstore/api_index)

#### License

MIT
