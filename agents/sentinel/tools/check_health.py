from typing import Dict, Any

TOOL_SCHEMA = {
    "name": "check_health",
    "description": "Checks all API endpoint statuses.",
    "parameters": {
        "type": "object",
        "properties": {}
    }
}

def check_health() -> Dict[str, Any]:
    """
    Checks all API endpoint statuses.

    Returns:
        Dict[str, Any]: A dictionary containing a list of services with their status and latency, and overall status.
    """
    # Implementation details would go here
    return {
        "services": [
            {"name": "API", "status": "healthy", "latency": 45}
        ],
        "overall": "healthy"
    }
