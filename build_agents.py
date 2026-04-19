import os
import yaml
import json

def create_agent(name, model, description, instruction, tools, directory):
    agent_data = {
        "name": name,
        "model": model,
        "description": description,
        "instruction": instruction,
        "tools": tools
    }

    os.makedirs(directory, exist_ok=True)
    with open(os.path.join(directory, "agent.yaml"), "w") as f:
        yaml.dump(agent_data, f, sort_keys=False)

def create_tool(directory, tool_name, accepts, returns, desc):
    os.makedirs(directory, exist_ok=True)
    schema_str = f"TOOL_SCHEMA = {{\n    'description': '{desc}',\n    'parameters': {json.dumps(accepts, indent=4)},\n    'returns': {json.dumps(returns, indent=4)}\n}}\n"
    content = f'''"""
{desc}
"""
from typing import Dict, Any

{schema_str}

def execute(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes the {tool_name} tool.

    Args:
        params: The parameters for the tool as defined in TOOL_SCHEMA.

    Returns:
        The result of the tool execution as defined in TOOL_SCHEMA.
    """
    # TODO: Implement tool logic
    pass
'''
    with open(os.path.join(directory, f"{tool_name}.py"), "w") as f:
        f.write(content)


# --- Courier ---
courier_dir = "agents/courier"
create_agent(
    "Courier", "gemini-2.0-flash",
    "Communications agent handling email, calendar, tasks, notifications, and meeting notes",
    "You are Courier, the communications nerve center of Gravix. You manage all Gmail operations (classify, compose, summarize), Google Calendar (create events, check availability), Google Tasks (create, complete, organize), FCM push notifications, and Google Meet transcript processing. You learn email templates from patterns and auto-tag communications to client profiles.",
    ["email_classify", "email_compose", "calendar_manage", "task_manage", "send_notification", "learn_templates", "process_meeting"],
    courier_dir
)
t_dir = os.path.join(courier_dir, "tools")
create_tool(t_dir, "email_classify", {"type": "object", "properties": {"subject": {"type": "string"}, "from_addr": {"type": "string"}, "snippet": {"type": "string"}}, "required": ["subject", "from_addr", "snippet"]}, {"category": "string", "urgency": "string", "confidence": "number"}, "Classifies email into categories: client, action-required, invoice, newsletter, personal")
create_tool(t_dir, "email_compose", {"type": "object", "properties": {"to": {"type": "string"}, "subject_hint": {"type": "string"}, "context": {"type": "string"}, "tone": {"type": "string"}}, "required": ["to", "subject_hint", "context", "tone"]}, {"subject": "string", "body": "string", "suggested_attachments": "array"}, "Drafts email using context and templates")
create_tool(t_dir, "calendar_manage", {"type": "object", "properties": {"action": {"type": "string", "enum": ["create", "update", "query"]}, "event_data": {"type": "object"}}, "required": ["action", "event_data"]}, {"success": "boolean", "event_id": "string", "events": "array"}, "Creates, updates, or queries calendar events")
create_tool(t_dir, "task_manage", {"type": "object", "properties": {"action": {"type": "string", "enum": ["create", "complete", "list"]}, "task_data": {"type": "object"}}, "required": ["action", "task_data"]}, {"success": "boolean", "task_id": "string", "tasks": "array"}, "Creates or completes Google Tasks")
create_tool(t_dir, "send_notification", {"type": "object", "properties": {"title": {"type": "string"}, "body": {"type": "string"}, "data": {"type": "object"}, "topic": {"type": "string"}}, "required": ["title", "body", "data", "topic"]}, {"sent": "boolean", "message_id": "string"}, "Sends FCM push notification")
create_tool(t_dir, "learn_templates", {"type": "object", "properties": {"emails": {"type": "array", "items": {"type": "object", "properties": {"subject": {"type": "string"}, "body": {"type": "string"}}}}}, "required": ["emails"]}, {"templates": "array"}, "Analyzes sent emails for patterns and creates templates")
create_tool(t_dir, "process_meeting", {"type": "object", "properties": {"transcript": {"type": "string"}, "attendees": {"type": "array", "items": {"type": "string"}}}, "required": ["transcript", "attendees"]}, {"summary": "string", "action_items": "array", "decisions": "array", "follow_ups": "array"}, "Processes meeting transcript and extracts action items")

# --- Analyst ---
analyst_dir = "agents/analyst"
create_agent(
    "Analyst", "gemini-2.0-flash",
    "Data science agent that executes notebooks, analyzes data, and generates insights",
    "You are Analyst, the data science agent of Gravix. You execute Jupyter notebooks via Cloud Run, analyze financial data, health trends, and business metrics. You can run stock analysis, portfolio optimization, and custom data pipelines.",
    ["execute_notebook", "analyze_data", "format_results"],
    analyst_dir
)
t_dir = os.path.join(analyst_dir, "tools")
create_tool(t_dir, "execute_notebook", {"type": "object", "properties": {"notebook": {"type": "string"}, "parameters": {"type": "object"}}, "required": ["notebook", "parameters"]}, {"results": "object", "chart_urls": "array", "execution_time": "number"}, "Triggers Cloud Run notebook execution")
create_tool(t_dir, "analyze_data", {"type": "object", "properties": {"data": {"type": "object"}, "analysis_type": {"type": "string"}, "question": {"type": "string"}}, "required": ["data", "analysis_type", "question"]}, {"analysis": "string", "insights": "array", "recommendations": "array"}, "General data analysis using Gemini")
create_tool(t_dir, "format_results", {"type": "object", "properties": {"raw_results": {"type": "object"}, "format": {"type": "string", "enum": ["table", "chart", "summary"]}}, "required": ["raw_results", "format"]}, {"formatted": "object", "visualization_type": "string"}, "Formats analysis results for display")

# --- Builder ---
builder_dir = "agents/builder"
create_agent(
    "Builder", "gemini-2.0-flash",
    "Development agent that extracts code patterns, generates code, and manages Jules tasks",
    "You are Builder, the development agent of Gravix. You analyze merged PRs for reusable patterns, generate code snippets, and create Jules tasks for autonomous development. You maintain a pattern library and suggest refactors.",
    ["extract_patterns", "generate_code", "create_jules_task"],
    builder_dir
)
t_dir = os.path.join(builder_dir, "tools")
create_tool(t_dir, "extract_patterns", {"type": "object", "properties": {"pr_files": {"type": "array", "items": {"type": "object", "properties": {"filename": {"type": "string"}, "patch": {"type": "string"}}}}}, "required": ["pr_files"]}, {"patterns": "array"}, "Analyzes code changes for reusable patterns")
create_tool(t_dir, "generate_code", {"type": "object", "properties": {"spec": {"type": "string"}, "language": {"type": "string"}, "patterns_to_use": {"type": "array", "items": {"type": "string"}}}, "required": ["spec", "language", "patterns_to_use"]}, {"code": "string", "files": "array", "explanation": "string"}, "Generates code based on spec and existing patterns")
create_tool(t_dir, "create_jules_task", {"type": "object", "properties": {"title": {"type": "string"}, "prompt": {"type": "string"}, "branch": {"type": "string"}}, "required": ["title", "prompt", "branch"]}, {"session_id": "string", "status": "string"}, "Creates a Jules task for autonomous execution")

# --- Forge ---
forge_dir = "agents/forge"
create_agent(
    "Forge", "gemini-2.0-flash",
    "DevOps agent managing secrets, IAM, API configuration, and infrastructure",
    "You are Forge, the DevOps agent of Gravix. You manage Google Cloud infrastructure: Secret Manager for credential rotation, IAM for access control, API configuration and restrictions, and service account management. You auto-detect API changes and update configurations.",
    ["manage_secrets", "manage_iam", "configure_apis"],
    forge_dir
)
t_dir = os.path.join(forge_dir, "tools")
create_tool(t_dir, "manage_secrets", {"type": "object", "properties": {"action": {"type": "string", "enum": ["list", "get", "create", "rotate"]}, "secret_name": {"type": "string"}, "value": {"type": "string"}}, "required": ["action", "secret_name", "value"]}, {"success": "boolean", "secret_version": "string"}, "Manages Secret Manager secrets")
create_tool(t_dir, "manage_iam", {"type": "object", "properties": {"action": {"type": "string", "enum": ["list_roles", "add_role", "remove_role"]}, "member": {"type": "string"}, "role": {"type": "string"}}, "required": ["action", "member", "role"]}, {"success": "boolean", "current_roles": "array"}, "Manages IAM roles and service accounts")
create_tool(t_dir, "configure_apis", {"type": "object", "properties": {"action": {"type": "string", "enum": ["list", "enable", "restrict"]}, "api_name": {"type": "string"}, "restrictions": {"type": "array", "items": {"type": "string"}}}, "required": ["action", "api_name", "restrictions"]}, {"success": "boolean", "status": "string"}, "Manages API enablement and key restrictions")

print("Generated.")
