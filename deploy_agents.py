"""
Deploy all 7 Gravix agents to Vertex AI Agent Engine.
Uses the ADK framework with ReasoningEngine for managed deployment.
"""
import os
import yaml
import vertexai
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from vertexai import agent_engines

PROJECT_ID = "antigravity-hub-jcloud"
LOCATION = "us-central1"
STAGING_BUCKET = "gs://gravix-knowledge-docs/agent-staging"

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION, staging_bucket="gs://gravix-agent-staging")

AGENTS_DIR = os.path.join(os.path.dirname(__file__), "agents")

def load_agent_config(agent_name):
    """Load agent.yaml config."""
    yaml_path = os.path.join(AGENTS_DIR, agent_name, "agent.yaml")
    with open(yaml_path, "r") as f:
        return yaml.safe_load(f)

def create_tool_functions(agent_name, config):
    """Create placeholder tool functions from agent config."""
    tools_dir = os.path.join(AGENTS_DIR, agent_name, "tools")
    functions = []
    
    if not os.path.exists(tools_dir):
        return functions
    
    for py_file in os.listdir(tools_dir):
        if py_file.endswith(".py") and not py_file.startswith("__"):
            tool_name = py_file.replace(".py", "")
            # Create a callable function for each tool
            def make_tool(name, desc):
                def tool_fn(**kwargs):
                    """Tool execution placeholder - will be wired to real implementations."""
                    return {"tool": name, "status": "executed", "params": kwargs}
                tool_fn.__name__ = name
                tool_fn.__doc__ = desc
                return tool_fn
            
            functions.append(make_tool(tool_name, f"Tool: {tool_name} for agent {agent_name}"))
    
    return functions

def deploy_agent(agent_name):
    """Deploy a single agent to Vertex AI Agent Engine."""
    print(f"\n{'='*50}")
    print(f"  Deploying: {agent_name}")
    print(f"{'='*50}")
    
    config = load_agent_config(agent_name)
    print(f"  Model: {config.get('model', 'gemini-2.0-flash')}")
    print(f"  Description: {config.get('description', 'N/A')[:60]}")
    
    # Create ADK Agent
    tool_fns = create_tool_functions(agent_name, config)
    print(f"  Tools: {len(tool_fns)}")
    
    agent = Agent(
        model=config.get("model", "gemini-2.0-flash"),
        name=agent_name,
        description=config.get("description", ""),
        instruction=config.get("instruction", ""),
        tools=[FunctionTool(fn) for fn in tool_fns] if tool_fns else None,
    )
    
    # Deploy to Agent Engine as ReasoningEngine
    try:
        remote_agent = agent_engines.create(
            agent,
            requirements=[
                "google-adk>=1.0.0",
                "google-cloud-aiplatform[agent_engines,adk]",
            ],
            display_name=f"gravix-{agent_name}",
            description=config.get("description", ""),
        )
        
        resource_name = remote_agent.resource_name
        print(f"  ✅ Deployed: {resource_name}")
        return {"name": agent_name, "resource_name": resource_name, "status": "deployed"}
    except Exception as e:
        print(f"  ❌ Failed: {str(e)[:100]}")
        return {"name": agent_name, "error": str(e), "status": "failed"}

def main():
    """Deploy all 7 agents."""
    agents = ["conductor", "scholar", "sentinel", "courier", "analyst", "builder", "forge"]
    
    print("=" * 50)
    print("  GRAVIX AGENT ENGINE DEPLOYMENT")
    print(f"  Project: {PROJECT_ID}")
    print(f"  Location: {LOCATION}")
    print("=" * 50)
    
    results = []
    for agent_name in agents:
        agent_dir = os.path.join(AGENTS_DIR, agent_name)
        if not os.path.exists(os.path.join(agent_dir, "agent.yaml")):
            print(f"\n  ⚠️ Skipping {agent_name}: no agent.yaml found")
            continue
        
        result = deploy_agent(agent_name)
        results.append(result)
    
    # Summary
    print("\n" + "=" * 50)
    print("  DEPLOYMENT SUMMARY")
    print("=" * 50)
    deployed = [r for r in results if r["status"] == "deployed"]
    failed = [r for r in results if r["status"] == "failed"]
    
    print(f"  ✅ Deployed: {len(deployed)}")
    for r in deployed:
        print(f"     {r['name']}: {r['resource_name']}")
    
    if failed:
        print(f"  ❌ Failed: {len(failed)}")
        for r in failed:
            print(f"     {r['name']}: {r['error'][:80]}")
    
    # Save registry
    if deployed:
        import json
        registry_path = os.path.join(AGENTS_DIR, "engine_registry.json")
        registry = {r["name"]: r["resource_name"] for r in deployed}
        with open(registry_path, "w") as f:
            json.dump(registry, f, indent=2)
        print(f"\n  📝 Registry saved: {registry_path}")

if __name__ == "__main__":
    main()
