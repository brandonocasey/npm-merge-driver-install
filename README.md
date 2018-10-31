<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [npm-merge-driver-install](#npm-merge-driver-install)
  - [Installation](#installation)
  - [When will it install](#when-will-it-install)
  - [Options](#options)
    - [NPM_MERGE_DRIVER_SKIP_INSTALL](#npm_merge_driver_skip_install)
    - [NPM_MERGE_DRIVER_IGNORE_CI](#npm_merge_driver_ignore_ci)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# npm-merge-driver-install

[![Build Status](https://travis-ci.org/BrandonOCasey/npm-merge-driver-install.svg?branch=master)](https://travis-ci.org/BrandonOCasey/npm-merge-driver-install)
[![Greenkeeper badge](https://badges.greenkeeper.io/BrandonOCasey/npm-merge-driver-install.svg)](https://greenkeeper.io/)

A package to automatically install [npm-merge-driver](https://www.npmjs.com/package/npm-merge-driver) when possible.

## Installation
To install run

```
npm i --save-dev npm-merge-driver-install
```

## When will it install
It will install when:
1. We are not running in a CI, unless the [`NPM_MERGE_DRIVER_IGNORE_CI`](###NPM_MERGE_DRIVER_IGNORE_CI) option is used.
2. The root project has a `.git` directory.
3. The [`NPM_MERGE_DRIVER_SKIP_INSTALL`](###NPM_MERGE_DRIVER_SKIP_INSTALL) option is not in use.

## Options
Options are passed through as command line environment variables

### NPM_MERGE_DRIVER_SKIP_INSTALL
If this variable is present in the environment when `npm-merge-driver-install` is installed, then `npm-merge-driver` will not be installed.

### NPM_MERGE_DRIVER_IGNORE_CI
If this variable is present in the environment when `npm-merge-driver-install` is installed on a CI it will be possible for `npm-merge-driver` to be installed in a CI.
