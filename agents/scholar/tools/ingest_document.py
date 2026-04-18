from typing import Dict, Any

TOOL_SCHEMA = {
    "name": "ingest_document",
    "description": "Processes and stores document metadata.",
    "parameters": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "The title of the document."
            },
            "content": {
                "type": "string",
                "description": "The text content of the document."
            },
            "source": {
                "type": "string",
                "description": "The source of the document."
            },
            "type": {
                "type": "string",
                "description": "The type or category of the document."
            }
        },
        "required": ["title", "content", "source", "type"]
    }
}

def ingest_document(title: str, content: str, source: str, type: str) -> Dict[str, Any]:
    """
    Processes and stores document metadata.

    Args:
        title (str): The title of the document.
        content (str): The text content of the document.
        source (str): The source of the document.
        type (str): The type or category of the document.

    Returns:
        Dict[str, Any]: A dictionary indicating if the document was ingested and its documentId.
    """
    # Implementation details would go here
    return {
        "ingested": True,
        "documentId": "new_doc_id_123"
    }
