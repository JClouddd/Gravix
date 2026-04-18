from typing import Dict, Any

TOOL_SCHEMA = {
    "name": "propose_agent",
    "description": "Given a gap description, generates a new agent proposal.",
    "parameters": {
        "type": "object",
        "properties": {
            "gap_description": {
                "type": "string",
                "description": "Description of the gap identified in the current agent ecosystem."
            }
        },
        "required": ["gap_description"]
    }
}

def propose_agent(gap_description: str) -> Dict[str, Any]:
    """
    Given a gap description, generates a new agent proposal.

    Args:
        gap_description (str): Description of the gap identified in the current agent ecosystem.

    Returns:
        Dict[str, Any]: A dictionary containing name, role, tools_needed, and reasoning.
    """
    # Implementation details would go here
    return {
        "name": "Designer",
        "role": "UI/UX and Graphic Design",
        "tools_needed": ["generate_image", "create_wireframe"],
        "reasoning": f"Based on the gap: {gap_description}"
    }
