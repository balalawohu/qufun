
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 只允许以下提交类型
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'build',
        'ci',
        'revert',
      ],
    ],

    // 提交类型不能为空
    'type-empty': [2, 'never'],

    // 描述不能为空
    'subject-empty': [2, 'never'],

    // 提交标题最多 100 个字符
    'header-max-length': [2, 'always', 100],
  },
};
