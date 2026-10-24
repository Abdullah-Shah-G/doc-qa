import io
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from langchain_core.embeddings import DeterministicFakeEmbedding
import main
import chain


class AppTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.patcher = patch.object(main, 'UPLOAD_DIR', self.root)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.client = TestClient(main.app)

    def test_reject_paths_and_unbounded_queries(self):
        for value in ('../other', '*', '/tmp/file'):
            self.assertEqual(self.client.post('/api/index', params={'doc_id': value}).status_code, 422)
            self.assertEqual(self.client.post('/api/query', json={'doc_id': value, 'question': 'q'}).status_code, 422)
            with self.assertRaises(ValueError):
                chain.load_vector_store(value)
        self.assertEqual(self.client.post('/api/query', json={'doc_id': '00000000-0000-0000-0000-000000000000', 'question': 'q', 'top_k': 1000}).status_code, 422)

    def test_invalid_and_large_upload_cleanup(self):
        for body in (b'', b'not a pdf'):
            self.assertEqual(self.client.post('/api/upload', files={'file': ('x.pdf', body)}).status_code, 400)
        with patch.object(main, 'MAX_UPLOAD_BYTES', 5):
            self.assertEqual(self.client.post('/api/upload', files={'file': ('x.pdf', b'%PDF-1.4')}).status_code, 413)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_blank_pdf_gets_actionable_error(self):
        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        buffer = io.BytesIO()
        writer.write(buffer)
        upload = self.client.post('/api/upload', files={'file': ('blank.pdf', buffer.getvalue())})
        self.assertEqual(upload.status_code, 200)
        response = self.client.post('/api/index', params={'doc_id': upload.json()['doc_id']})
        self.assertEqual(response.status_code, 400)
        self.assertIn('extractable text', response.text)

    def test_script_parses(self):
        script = main.render('index.html').split('<script>')[1].split('</script>')[0]
        result = subprocess.run(['node', '--check'], input=script, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_index_roundtrip_without_network(self):
        doc_id = '00000000-0000-0000-0000-000000000001'
        embeddings = DeterministicFakeEmbedding(size=16)
        with patch.object(chain, 'VECTOR_STORE_DIR', self.root), patch.object(chain, 'get_embeddings', return_value=embeddings), patch.object(chain, 'parse_pdf', return_value=[{'page': 1, 'text': 'The refund period is thirty days.'}]):
            self.assertEqual(chain.index_document('unused.pdf', 'sample.pdf', doc_id), 1)
            store = chain.load_vector_store(doc_id)
            docs = store.similarity_search('refund', k=1)
            self.assertEqual(docs[0].metadata['filename'], 'sample.pdf')
            self.assertEqual(docs[0].metadata['page'], 1)


if __name__ == '__main__':
    unittest.main()
