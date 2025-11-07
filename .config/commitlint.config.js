import angularConfig from '@commitlint/config-angular';

const headerPattern = /^(\w*)(?:\((.*)\))?: (.*?)(?: \[(\w+-\d+)\])?$/;

const types = ['build', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test', 'chore'];

const scopes = ['core', 'deps', 'config', 'docs', 'test'];

export default {
  parserPreset: {
    parserOpts: {
      headerCorrespondence: ['type', 'scope', 'subject', 'jira'],
      headerPattern,
    },
  },
  rules: {
    ...angularConfig.rules,
    'header-max-length': [2, 'always', 120],
    'scope-enum': [2, 'always', scopes],
    'type-enum': [2, 'always', types],
  },
};
