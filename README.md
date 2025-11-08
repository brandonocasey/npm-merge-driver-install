# npm-merge-driver-install

Automatically merge package manager lockfiles during git merges. Supports npm, pnpm, yarn, bun, and deno. Heavily based
on [npm-merge-driver](https://www.npmjs.com/package/npm-merge-driver) with automated setup at package install time and a
single small dependency for ci checking.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of contents

- [Supported Package Managers](#supported-package-managers)
  - [How It Works](#how-it-works)
- [Installation](#installation)
- [Automatic package.json Conflict Resolution](#automatic-packagejson-conflict-resolution)
  - [How to Enable](#how-to-enable)
  - [Resolution Strategies](#resolution-strategies)
  - [How It Works](#how-it-works-1)
- [I don't want it to install in ci](#i-dont-want-it-to-install-in-ci)
- [Provided binaries](#provided-binaries)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Supported Package Managers

This tool automatically detects and merges lockfiles for the following package managers:

| Package Manager | Lockfile(s) | Notes |
|----------------|-------------|-------|
| **npm** | `package-lock.json`, `npm-shrinkwrap.json` | Fully supported |
| **pnpm** | `pnpm-lock.yaml` | Fully supported |
| **Yarn v1 (Classic)** | `yarn.lock` | Fully supported, auto-detected via lockfile format |
| **Yarn v2+ (Berry)** | `yarn.lock` | Fully supported, auto-detected via lockfile format |
| **Bun** | `bun.lock`, `bun.lockb` | Text format (`bun.lock`) fully supported. Binary format (`bun.lockb`) has limited text merge capability but package manager resolution works |
| **Deno** | `deno.lock` | Supported for JSON-based integrity checking |

### How It Works

**At Installation Time** (via the `prepare` script):

1. Registers a git merge driver that applies to all supported lockfile types
2. Configures git attributes for all lockfile patterns (package-lock.json, pnpm-lock.yaml, yarn.lock, etc.)

**During Git Merges** (automatically when conflicts occur):

1. Detects which package manager's lockfile is being merged based on the filename
2. Attempts a text-based 3-way merge of the lockfile
3. Runs the appropriate package manager command to regenerate and validate the lockfile
4. Ensures the final lockfile is consistent with package.json

No configuration needed - it just works! The merge driver works for all supported package managers automatically.

## Installation

To install run

```bash
npm i --save-dev npm-merge-driver-install
```

then add a prepare script in package.json like the following:

```json
{"prepare": "npm-merge-driver-install"}
```

## Automatic package.json Conflict Resolution

By default, this merge driver only handles lockfile conflicts. When package.json has conflicts during a merge,
you must resolve them manually before the lockfile can be regenerated.

You can optionally enable **automatic package.json conflict resolution** to handle these conflicts
automatically using intelligent merge strategies.

### How to Enable

Enable this feature during installation by passing the `--resolve-package-json` flag:

```bash
# Enable with default 'ours' strategy (recommended)
npm-merge-driver-install --resolve-package-json

# Or specify the strategy explicitly
npm-merge-driver-install --resolve-package-json=ours
npm-merge-driver-install --resolve-package-json=theirs
```

Add this to your `prepare` script in package.json:

```json
{"prepare": "npm-merge-driver-install --resolve-package-json"}
```

### Resolution Strategies

**`ours` (default, recommended)**

- Prioritizes changes from your current branch
- Applies your branch's changes on top of the incoming changes
- Best for: feature branches being merged into main, most development workflows
- Matches git's default merge behavior

**`theirs`**

- Prioritizes changes from the incoming branch
- Applies incoming changes on top of your branch's changes
- Best for: updating from upstream, pulling in dependency updates

Both strategies use intelligent diff-based merging that attempts to preserve changes from both sides when
possible. When conflicts cannot be automatically resolved (e.g., type mismatches), the strategy determines
which version wins.

### How It Works

1. **During a merge**, if package.json has conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`):
   - The merge driver automatically detects the conflicts
   - Uses the configured strategy to intelligently resolve them
   - Writes the resolved package.json
   - Proceeds to regenerate the lockfile as normal

2. **If automatic resolution fails**:
   - Falls back to the standard behavior
   - Exits with an error asking you to manually resolve package.json
   - You can then fix conflicts and re-run your package manager

3. **Configuration is stored** in git config:
   - Stored as: `merge.npm-merge-driver-install.resolvePackageJson`
   - Persists across merges for consistent behavior
   - Can be changed by running the install command again with a different strategy

**Note**: This feature uses the [parse-conflict-json](https://www.npmjs.com/package/parse-conflict-json) library,
which only supports 'ours' and 'theirs' strategies (not 'parent' or 'union' strategies).

## I don't want it to install in ci

create a prepare.js file and change your prepare script to the following:

```js
// NOTE: you can use is-ci here or other custom code
import isCI from 'is-ci';
import { install } from 'npm-merge-driver-install';

if (!isCI) {
  install(process.cwd());
}
```

You can also pass options to the `install()` function:

```js
import { install } from 'npm-merge-driver-install';

// Install with package.json conflict resolution
install(process.cwd(), {
  resolvePackageJson: 'ours' // or 'theirs'
});
```

then change the `prepare` script in package.json to

```json
{"prepare": "node prepare.js"}
```

## Provided binaries

- `npm-merge-driver-install`: install merge driver for all detected package managers
- `npm-merge-driver-uninstall`: uninstall merge driver
- `npm-merge-driver-merge`: the internal merge binary used to merge package manager lockfiles
- `npm-merge-driver-is-installed`: check if npm-merge-driver-install is installed
