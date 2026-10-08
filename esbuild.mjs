import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const withTests = process.argv.includes('--tests');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  bundle: true,
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
  logLevel: 'info',
};

/** @type {import('esbuild').BuildOptions} */
const testOptions = {
  entryPoints: ['test/runTest.ts', 'test/suite/index.ts', 'test/suite/extension.test.ts'],
  outdir: 'out/test',
  bundle: true,
  external: ['vscode', 'mocha'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
  if (withTests) {
    await esbuild.build(testOptions);
  }
}
