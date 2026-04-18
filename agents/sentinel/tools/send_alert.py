from typing import Dict, Any

TOOL_SCHEMA = {
    "name": "send_alert",
    "description": "Sends FCM push notification.",
    "parameters": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "The title of the alert."
            },
            "body": {
                "type": "string",
                "description": "The body of the alert."
            },
            "severity": {
                "type": "string",
                "description": "The severity level of the alert."
            }
        },
        "required": ["title", "body", "severity"]
    }
}

def send_alert(title: str, body: str, severity: str) -> Dict[str, Any]:
    """
    Sends FCM push notification.

    Args:
        title (str): The title of the alert.
        body (str): The body of the alert.
        severity (str): The severity level of the alert.

    Returns:
        Dict[str, Any]: A dictionary indicating if the alert was successfully sent.
    """
    # Implementation details would go here
    return {
        "sent": True
    }
