# npm-merge-driver-install

[![Build Status](https://travis-ci.org/BrandonOCasey/npm-merge-driver-install.svg?branch=master)](https://travis-ci.org/BrandonOCasey/npm-merge-driver-install)
[![Greenkeeper badge](https://badges.greenkeeper.io/BrandonOCasey/npm-merge-driver-install.svg)](https://greenkeeper.io/)

A package to automatically merge package-lock.json conflicts. Heavily based on [npm-merge-driver](https://www.npmjs.com/package/npm-merge-driver) with automated setup at package install time and a single small dependency for ci checking.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Installation](#installation)
- [I don't want it to install in ci](#i-dont-want-it-to-install-in-ci)
- [Provided binaries](#provided-binaries)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation
To install run

```
npm i --save-dev npm-merge-driver-install
```

then add a prepare script in package.json like the following:
```
{"prepare": "npm-merge-driver-install"}
```

## I don't want it to install in ci

create a prepare.js file and change your prepare script to the following:

```js
// NOTE: you can use is-ci here or other custom code
const isCI = require('is-ci');
const npmMergeDriverInstall = require('npm-merge-driver-install');

if (!isCi) {
  npmMergeDriverInstall.install();
}
```

then change the `prepare` script in package.json to
```
{"prepare": "node prepare.js"}
```

## Provided binaries
* `npm-merge-driver-install`: install npm merge driver
* `npm-merge-driver-uninstall`: uninstall npm merge driver
* `npm-merge-driver-merge`: the internal merge binary used to merge package.json and package-lock.json
* `npm-merge-driver-is-installed`: check if npm-merge-driver-install is installed
