#!/usr/bin/env python3
"""After each Claude turn, update **Status:** in docs/*.md for any plan whose files changed."""
import subprocess, os, re, sys

PLANS_DIR = "/home/talha/Documents/projects/renderical/docs"
REPO_DIR = "/home/talha/Documents/projects/renderical"
TERMINAL_STATUSES = {"Done", "Superseded"}

STATUS_RE = re.compile(r"(\*\*Status:\*\*\s*)(Not started|In progress|Blocked)")


def get_changed_files():
    r = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=REPO_DIR, capture_output=True, text=True
    )
    if r.returncode != 0:
        return []
    files = []
    for line in r.stdout.splitlines():
        if len(line) > 3:
            fname = line[3:].strip()
            if not fname.startswith("docs/") and not fname.startswith(".claude/"):
                files.append(fname)
    return files


def search_terms(files):
    terms = set()
    for f in files:
        parts = f.replace("\\", "/").split("/")
        base = parts[-1]
        if len(base) > 4:
            terms.add(base)
        if len(parts) > 1:
            segment = f"{parts[-2]}/{parts[-1]}"
            terms.add(segment)
    return terms


def update_plan(path, terms):
    with open(path) as f:
        content = f.read()

    m = STATUS_RE.search(content)
    if not m:
        return
    current = m.group(2)
    if current in TERMINAL_STATUSES:
        return

    if not any(t in content for t in terms):
        return

    new_content = STATUS_RE.sub(r"\1In progress", content, count=1)
    with open(path, "w") as f:
        f.write(new_content)
    print(f"[plan] {os.path.basename(path)}: {current} → In progress", flush=True)


def main():
    changed = get_changed_files()
    if not changed:
        return
    terms = search_terms(changed)
    if not terms:
        return
    for name in sorted(os.listdir(PLANS_DIR)):
        if not name.endswith(".md") or name == "README.md":
            continue
        update_plan(os.path.join(PLANS_DIR, name), terms)


if __name__ == "__main__":
    main()
