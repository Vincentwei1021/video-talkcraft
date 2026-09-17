"""Offline migration regressions. Run: python3 -m unittest discover -s runtime -p 'test_*.py' -v."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest


class RuntimeMigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='talkcraft-runtime-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.rt = self.root / 'runtime'
        self.proj = self.root / 'project'
        self.wb = self.root / 'workbench'
        for directory in (self.rt, self.proj, self.wb):
            directory.mkdir()
        for name in ('link-runtime.sh', 'check-runtime.sh'):
            shutil.copy2(Path(__file__).parent / name, self.rt / name)
        self.write(self.rt / 'package.json', {'dependencies': {'remotion': '4.0.519'}})
        self.install('remotion', '4.0.519')
        self.original = json.dumps({'name': 'existing', 'scripts': {'render': 'kept'}, 'dependencies': {'remotion': '4.0.518'}})
        (self.proj / 'package.json').write_text(self.original)
        (self.proj / 'node_modules').mkdir()
        (self.proj / 'node_modules' / 'keep').write_text('old dependency')

    def write(self, path, value):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))

    def install(self, name, version):
        self.write(self.rt / 'node_modules' / name / 'package.json', {'name': name, 'version': version})

    def link(self, env=None):
        return subprocess.run(['bash', str(self.rt / 'link-runtime.sh'), str(self.proj)], text=True, capture_output=True, timeout=15, env=env)

    def unchanged(self, result, original=None):
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertFalse((self.proj / 'node_modules').is_symlink())
        self.assertEqual((self.proj / 'node_modules' / 'keep').read_text(), 'old dependency')
        self.assertEqual((self.proj / 'package.json').read_text(), original or self.original)
        self.assertEqual(list(self.proj.glob('.talkcraft-*')), [])

    def test_missing_dependency_preserves_existing_install_and_manifest(self):
        data = json.loads(self.original)
        data['dependencies']['project-only'] = '1.0.0'
        self.original = json.dumps(data)
        (self.proj / 'package.json').write_text(self.original)
        result = self.link()
        self.unchanged(result)
        self.assertIn('project-only', result.stderr)

    def test_declared_but_uninstalled_dependency_is_rejected(self):
        shutil.rmtree(self.rt / 'node_modules' / 'remotion')
        self.unchanged(self.link())

    def test_installed_version_must_match_runtime(self):
        self.install('remotion', '4.0.518')
        self.unchanged(self.link())

    def test_invalid_manifest_leaves_dependencies_intact(self):
        (self.proj / 'package.json').write_text('{invalid')
        self.unchanged(self.link(), '{invalid')

    def test_success_aligns_versions_preserves_scripts_and_is_repeatable(self):
        for _ in range(2):
            result = self.link()
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((self.proj / 'node_modules').is_symlink())
            self.assertEqual((self.proj / 'node_modules').resolve(), (self.rt / 'node_modules').resolve())
            pkg = json.loads((self.proj / 'package.json').read_text())
            self.assertEqual(pkg['dependencies']['remotion'], '4.0.519')
            self.assertEqual(pkg['scripts']['render'], 'kept')
            self.assertEqual(list(self.proj.glob('.talkcraft-*')), [])
            self.assertTrue((self.rt / 'node_modules' / 'remotion' / 'package.json').exists())

    def test_project_dangling_symlink_can_be_replaced(self):
        shutil.rmtree(self.proj / 'node_modules')
        (self.proj / 'node_modules').symlink_to(self.root / 'gone')
        result = self.link()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.proj / 'node_modules').resolve(), (self.rt / 'node_modules').resolve())

    def test_publish_failure_rolls_back_previous_dependencies(self):
        preload = self.root / 'fail-publish.cjs'
        preload.write_text("""const fs = require('node:fs');
const rename = fs.renameSync;
fs.renameSync = (from, to) => {
  if (String(from).includes('.talkcraft-package-')) throw new Error('simulated publish failure');
  return rename(from, to);
};
""")
        env = dict(os.environ, NODE_OPTIONS=f'--require={preload}')
        self.unchanged(self.link(env))

    def test_check_runtime_repairs_dangling_workbench_link(self):
        (self.wb / 'node_modules').symlink_to(self.root / 'moved-away' / 'node_modules')
        self.write(self.rt / 'package-lock.json', {})
        self.write(self.rt / 'node_modules' / '.package-lock.json', {})
        old = time.time() - 10
        os.utime(self.rt / 'package-lock.json', (old, old))
        (self.rt / 'node_modules' / '.remotion' / 'chrome-headless-shell').mkdir(parents=True)
        binary = self.root / 'bin'
        binary.mkdir()
        npm = binary / 'npm'
        npm.write_text('#!/bin/sh\n[ "$1" = view ] || exit 90\necho 4.0.519\n')
        npm.chmod(0o755)
        env = dict(os.environ, PATH=f'{binary}{os.pathsep}{os.environ["PATH"]}', TALKCRAFT_SMOKE='0')
        result = subprocess.run(['bash', str(self.rt / 'check-runtime.sh')], capture_output=True, text=True, env=env, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.wb / 'node_modules').resolve(), (self.rt / 'node_modules').resolve())


if __name__ == '__main__':
    unittest.main()
