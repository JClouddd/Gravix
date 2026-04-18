from typing import Dict, Any

TOOL_SCHEMA = {
    "name": "search_web",
    "description": "Searches the web for additional information.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query."
            }
        },
        "required": ["query"]
    }
}

def search_web(query: str) -> Dict[str, Any]:
    """
    Searches the web for additional information.

    Args:
        query (str): The search query.

    Returns:
        Dict[str, Any]: A dictionary containing search results.
    """
    # Implementation details would go here
    return {
        "results": ["Mocked web search result"]
    }
