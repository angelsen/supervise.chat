"""Usage, from the repo root: uv run python www/scripts/seatview-gen.py > www/src/generated/seatview.json

The seat view as `seatview.lines()` draws it for a made-up project, one frame per step of a handoff, as HTML
lines whose spans carry the ANSI style as a class. The site themes the classes; nothing here is a live seat's.
"""

import html
import json
import re
import sys

from supervise import seatview

WIDTH, ROWS = 96, 24
HOME = "/home/ada"
NOW = 1_800_000_000.0
CAIRN = f"{HOME}/cairn"
REPO = f"{HOME}/code/atlas"

# 256-colour codes `seatview` uses, as the class the site themes.
TONE = {114: "ok", 179: "warn", 167: "bad", 110: "info", 245: "dim", 240: "faint"}
SGR = re.compile(r"\x1b\[([0-9;]*)m")


def to_html(line: str) -> str:
    out, classes, at = [], [], 0
    for m in SGR.finditer(line):
        text = line[at:m.start()]
        if text:
            esc = html.escape(text)
            out.append(f'<span class="{" ".join(classes)}">{esc}</span>' if classes else esc)
        at = m.end()
        codes = [int(c) for c in m.group(1).split(";") if c] or [0]
        if codes[:2] == [38, 5]:
            classes = [c for c in classes if c not in TONE.values()] + [TONE.get(codes[2], "dim")]
        elif codes == [0]:
            classes = []
        elif codes == [1]:
            classes.append("b")
        elif codes == [7]:
            classes.append("rev")
    rest = line[at:]
    if rest:
        esc = html.escape(rest)
        out.append(f'<span class="{" ".join(classes)}">{esc}</span>' if classes else esc)
    return "".join(out)


def seat(name, start, since, turn="working", **more):
    return {"seat": name, "start": start, "until": None, "state": "armed", "reason": None,
            "armed_at": NOW - 5400, "handoff": {}, "dir": CAIRN, "kind": "pane", "project": "atlas",
            "turn": {"state": turn, "since_s": since}, **more}


def host(name, start, status="busy"):
    return {"name": name, "start": start, "pid": 4000 + int(start), "child_pid": 4001 + int(start), "dir": CAIRN,
            "place": f"/dev/pts/{start}", "session_id": f"{start}c0ffee-0000-4000-8000-000000000000",
            "status": status, "socket": f"/run/user/1000/supervise/seat-{name}.sock", "title": name}


def flight(key, kind, what, who, ago_s, branch):
    return {"key": key, "kind": kind, "what": what, "who": who, "task_id": key, "parent": None, "branch": branch,
            "repo": REPO, "project": REPO, "started": NOW - ago_s, "waiting_on": None, "noted_at": None}


def status(w1_status, w1_turn, w1_since, flights, master_status):
    names = [("master", "11"), ("w1", "12"), ("w2", "13"), ("w3", "14")]
    roster = {
        "master": master_status,
        "w1": w1_status,
        "w2": "export: streaming CSV writer, tests green, in review",
        "w3": "search: reproducing the empty-result bug on a scratch db",
    }
    return {
        "version": "0.1.0", "daemon": {"running": False},
        "masters": [{"seat": "master", "start": "11", "dir": CAIRN, "gone": False, "covers": [CAIRN, REPO],
                     "lands": True, "lands_for": [CAIRN, REPO]}],
        "seats": [
            seat("master", "11", 40, "idle", role="master", master_of=CAIRN, masters_of=[REPO],
                 lands={"on": True, "minted_at": NOW - 5000, "minted_by": "shell"}),
            seat("w1", "12", w1_since, w1_turn),
            seat("w2", "13", 95),
            seat("w3", "14", 310),
        ],
        "conversations": [],
        "hosts": [host(n, s, "idle" if n == "master" else "busy") for n, s in names],
        "inflight": flights,
        "roster": {n: {"status": roster[n], "at": NOW - 60, "state": "active",
                       "session_id": f"{s}c0ffee-0000-4000-8000-000000000000"} for n, s in names},
        "main_checkouts": [],
    }


VERIFY = flight("a1b2c3d4", "verify", "agent-w2-export in ada/atlas", "w2", 140, "agent-w2-export")
FRAMES = [
    ("working", status("auth: session refresh, writing the failing test first", "working", 420, [VERIFY],
                       "routing: w1 auth, w2 export, w3 search")),
    ("recap ready", status("auth: refresh fixed and committed; recap written, handoff: ready", "idle", 4, [VERIFY],
                           "routing: w1 auth, w2 export, w3 search")),
    ("cleared", status("declared: nothing yet", "working", 2, [VERIFY],
                       "w1 cleared; successor sent its next")),
    ("landing", status("auth: continuing from the recap: token rotation next", "working", 65,
                       [VERIFY, flight("e5f6a7b8", "integrate", "agent-w1-auth into ada/atlas", "master", 12,
                                       "agent-w1-auth")],
                       "landing agent-w1-auth; w2 export in verify")),
]


def main() -> None:
    session = {"sessionId": "12c0ffee-0000-4000-8000-000000000000", "status": "busy", "cwd": CAIRN}
    frames = []
    for label, st in FRAMES:
        rows = seatview.lines(st, session, "w1", WIDTH, ROWS, start="12", checkout=CAIRN, project="atlas",
                              now=NOW, home=HOME)
        frames.append({"label": label, "lines": [to_html(r) for r in rows]})
    json.dump({"width": WIDTH, "rows": ROWS, "frames": frames}, sys.stdout, indent=1)


if __name__ == "__main__":
    main()
