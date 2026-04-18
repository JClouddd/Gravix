from typing import Dict, Any

TOOL_SCHEMA = {
    "name": "check_costs",
    "description": "Reads cost data and compares to budget.",
    "parameters": {
        "type": "object",
        "properties": {}
    }
}

def check_costs() -> Dict[str, Any]:
    """
    Reads cost data and compares to budget.

    Returns:
        Dict[str, Any]: A dictionary containing totalSpend, budget, percentage, and alert status.
    """
    # Implementation details would go here
    return {
        "totalSpend": 15.50,
        "budget": 50.00,
        "percentage": 31.0,
        "alert": False
    }
