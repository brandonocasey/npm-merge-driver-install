# npm-merge-driver-install
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
