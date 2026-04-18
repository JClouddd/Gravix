from typing import List, Dict, Any

TOOL_SCHEMA = {
    "name": "analyze_patterns",
    "description": "Reads recent routing decisions from a provided list to identify gaps, underutilized agents, and patterns that don't fit existing agents.",
    "parameters": {
        "type": "object",
        "properties": {
            "decisions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "description": "A routing decision object."
                },
                "description": "A list of recent routing decisions to analyze."
            }
        },
        "required": ["decisions"]
    }
}

def analyze_patterns(decisions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Reads recent routing decisions from a provided list to identify gaps,
    underutilized agents, and patterns that don't fit existing agents.

    Args:
        decisions (List[Dict[str, Any]]): A list of recent routing decisions to analyze.

    Returns:
        Dict[str, Any]: A dictionary containing gaps, underutilized, and proposals.
    """
    # Implementation details would go here
    return {
        "gaps": ["Image Generation"],
        "underutilized": ["Builder"],
        "proposals": ["Creative Agent"]
    }
