import json

log_path = r"C:\Users\Computs\.gemini\antigravity\brain\fe474ea9-bf7d-4b17-af0d-eb377a6df9f6\.system_generated\logs\transcript_full.jsonl"
output_path = r"C:\antigravity-projects\pyjama-dz\scratch\reconstructed_StockTab.jsx"

content = ""

def apply_replace(target, replacement, content):
    if target in content:
        return content.replace(target, replacement, 1) # Only replace the first match if multiple? Wait, tool replaces first match or multiple based on AllowMultiple. The tool replaces one if it's unique.
    else:
        print(f"Warning: Target not found! Target preview: {repr(target[:50])}")
        return content

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
                            continue
                    target_file = args.get('TargetFile', '')
                    if 'StockTab.jsx' in target_file:
                        if name == 'write_to_file':
                            content = args.get('CodeContent', '')
                            print(f"Loaded initial content at line {line_idx}, len={len(content)}")
                        elif name == 'replace_file_content':
                            t = args.get('TargetContent', '')
                            r = args.get('ReplacementContent', '')
                            if args.get('AllowMultiple', False):
                                content = content.replace(t, r)
                            else:
                                content = content.replace(t, r, 1)
                            print(f"Applied replace at line {line_idx}")
                        elif name == 'multi_replace_file_content':
                            chunks = args.get('ReplacementChunks', [])
                            for c in chunks:
                                t = c.get('TargetContent', '')
                                r = c.get('ReplacementContent', '')
                                if c.get('AllowMultiple', False):
                                    content = content.replace(t, r)
                                else:
                                    content = content.replace(t, r, 1)
                            print(f"Applied multi_replace at line {line_idx} ({len(chunks)} chunks)")
            except Exception as e:
                pass

with open(output_path, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Wrote {len(content)} bytes to {output_path}")
