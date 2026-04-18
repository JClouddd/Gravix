import sys
import os

scripts = [
    "stock_analysis.py",
    "portfolio_optimizer.py",
    "health_trends.py",
    "document_processor.py",
    "data_pipeline.py"
]

def main():
    # Ensure we are in the right directory or scripts exist
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    print("Generating all notebooks...")
    for script in scripts:
        if os.path.exists(script):
            print(f"Running {script}...")
            # Import dynamically and call generate
            module_name = script[:-3]
            try:
                mod = __import__(module_name)
                mod.generate()
                print(f"  -> Successfully generated {module_name}.ipynb")
            except Exception as e:
                print(f"  -> Failed to run {script}: {e}")
        else:
            print(f"Script {script} not found in {base_dir}")

    print("Generation complete.")

if __name__ == "__main__":
    main()
