"""Regression coverage for rendered same-page anchors (upstream #1928)."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


CHECKER = Path(__file__).with_name("verify_internal_links.py")


class RenderedAnchorTests(unittest.TestCase):
    def check_html(self, html):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "index.html").write_text(html, encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(CHECKER), directory],
                capture_output=True,
                text=True,
            )

    def test_rendered_ids_unicode_legacy_names_and_empty_fragment(self):
        result = self.check_html('''
            <a href="#section-1">Forward reference</a>
            <h2 id="section-1">Section</h2>
            <h2 id="раздел">Раздел</h2>
            <a href="#%D1%80%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB">Encoded</a>
            <a name="legacy"></a><a href="#legacy">Legacy</a>
            <div id="a&amp;b"></div><a href="#a%26b">Entity</a>
            <a href="#">Top</a><a href="/">Home</a>
        ''')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Verified 6 internal links", result.stdout)

    def test_missing_and_malformed_fragments_fail_with_page_and_href(self):
        result = self.check_html('''
            <h2 id="translated-heading">Heading</h2>
            <a href="#original-heading">Untranslated anchor</a>
            <a href="#original-heading">Duplicate link</a>
            <a href="#%ZZ">Malformed escape</a>
        ''')
        self.assertEqual(result.returncode, 1)
        self.assertIn("Broken internal links found: 2 of 2", result.stderr)
        self.assertIn("index.html: #original-heading", result.stderr)
        self.assertIn("index.html: #%ZZ", result.stderr)

    def test_escaped_code_comments_and_external_fragments_are_ignored(self):
        result = self.check_html('''
            <pre>&lt;a href="#missing"&gt;Example&lt;/a&gt;</pre>
            <!-- <a href="#missing">Comment</a> -->
            <a href="https://example.test/#missing">External</a>
        ''')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Verified 0 internal links", result.stdout)

    def test_missing_page_still_fails(self):
        result = self.check_html('<a href="/missing#section">Missing page</a>')
        self.assertEqual(result.returncode, 1)
        self.assertIn("index.html: /missing#section", result.stderr)


if __name__ == "__main__":
    unittest.main()
