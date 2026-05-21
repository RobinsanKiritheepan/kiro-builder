import sys
import json
sys.path.insert(0, './backend')
from backend.router import _extract_json, _build_result

raw_response = """```json
{
  "files": [
    {
      "name": "index.html",
      "path": "/index.html",
      "content": "<h1>Hello</h1>",
      "language": "html"
    }
  ]
}
```

Voici l'application generee."""

parsed, prose = _extract_json(raw_response)
result = _build_result(parsed, prose, "gemini", 100)
print(json.dumps(result, indent=2))
