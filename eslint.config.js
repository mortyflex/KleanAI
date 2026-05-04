const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["node_modules/", ".expo/", "dist/"],
  },
  {
    // i18next's chained .use() API is a documented pattern on the default export
    files: ["src/lib/i18n.ts"],
    rules: {
      "import/no-named-as-default-member": "off",
    },
  },
];
