from typing import Dict, Any

TOOL_SCHEMA = {
    "name": "propose_rule",
    "description": "Given anomaly data, proposes a monitoring rule.",
    "parameters": {
        "type": "object",
        "properties": {
            "anomaly_data": {
                "type": "string",
                "description": "Data describing the anomaly."
            }
        },
        "required": ["anomaly_data"]
    }
}

def propose_rule(anomaly_data: str) -> Dict[str, Any]:
    """
    Given anomaly data, proposes a monitoring rule.

    Args:
        anomaly_data (str): Data describing the anomaly.

    Returns:
        Dict[str, Any]: A dictionary containing condition, threshold, action, and reasoning.
    """
    # Implementation details would go here
    return {
        "condition": "High latency",
        "threshold": 500,
        "action": "Alert Admin",
        "reasoning": f"Based on anomaly: {anomaly_data}"
    }
