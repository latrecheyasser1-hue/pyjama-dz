import json

log_path = r"C:\Users\Computs\.gemini\antigravity\brain\fe474ea9-bf7d-4b17-af0d-eb377a6df9f6\.system_generated\logs\transcript_full.jsonl"

print("Scanning log file for StockTab.jsx modifications...")
with open(log_path, "r", encoding="utf-8") as f:
    for line_idx, line in enumerate(f):
        if "PLANNER_RESPONSE" in line and "StockTab.jsx" in line:
            try:
                data = json.loads(line)
                for tc in data.get('tool_calls', []):
                    name = tc.get('name', '')
                    args = tc.get('args', {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    target = args.get('TargetFile', '')
                    if 'StockTab.jsx' in target:
                        print(f"Line {line_idx} (step {data.get('step_index')}): {name}")
            except Exception as e:
                pass
