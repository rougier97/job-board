"""Build a tailored CV PDF for every job in data/jobs.json.

Each job's "cv" field may override: profile (list of paragraphs), skills (list),
objective (str) and order ({company: [bullet indexes]}). Everything else
(names, dates, employers, education) always comes from data/cv.json, so a
tailored CV can never change facts.

Usage: python3 tools/make_cvs.py   (writes cvs/<job id>.pdf and cvs/base.pdf)
"""
import json, os, re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, KeepTogether, HRFlowable)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = json.load(open(os.path.join(ROOT, "data", "cv.json"), encoding="utf-8"))
JOBS = json.load(open(os.path.join(ROOT, "data", "jobs.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "cvs")
os.makedirs(OUT, exist_ok=True)

INK = colors.HexColor("#111111"); GREY = colors.HexColor("#555555")
S = {
    "name": ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=INK),
    "contact": ParagraphStyle("contact", fontName="Helvetica", fontSize=9.5, leading=13, textColor=INK, spaceAfter=4),
    "h": ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=INK, spaceBefore=8, spaceAfter=2),
    "p": ParagraphStyle("p", fontName="Helvetica", fontSize=9.5, leading=12.6, textColor=INK, spaceAfter=5),
    "role": ParagraphStyle("role", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=INK, spaceBefore=4),
    "dates": ParagraphStyle("dates", fontName="Helvetica", fontSize=8.8, leading=11, textColor=GREY, spaceAfter=1),
    "b": ParagraphStyle("b", fontName="Helvetica", fontSize=9.5, leading=12.4, textColor=INK, leftIndent=10, bulletIndent=2),
    "skill": ParagraphStyle("skill", fontName="Helvetica", fontSize=9.5, leading=12, textColor=INK),
}

def esc(t):
    return (str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

def merged(job_cv):
    cv = json.loads(json.dumps(BASE))
    if not job_cv:
        return cv
    if job_cv.get("profile"):
        cv["profile"] = [str(p) for p in job_cv["profile"]][:3]
    if job_cv.get("skills"):
        cv["skills"] = [str(s) for s in job_cv["skills"]][:9]
    if job_cv.get("objective"):
        cv["objective"] = str(job_cv["objective"])
    order = job_cv.get("order") or {}
    for x in cv["experience"]:
        idx = order.get(x["company"])
        if isinstance(idx, list):
            seen = [i for i in idx if isinstance(i, int) and 0 <= i < len(x["bullets"])]
            seen = list(dict.fromkeys(seen))
            seen += [i for i in range(len(x["bullets"])) if i not in seen]
            x["bullets"] = [x["bullets"][i] for i in seen]
    return cv

def heading(t):
    return [Paragraph(esc(t.upper()), S["h"]), HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#BBBBBB"), spaceAfter=5)]

def build(cv, path, title):
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
                            topMargin=16*mm, bottomMargin=14*mm, title=title, author=cv["name"])
    f = [Paragraph(esc(cv["name"].upper()), S["name"]),
         Paragraph(esc(" | ".join(x for x in [cv["location"], cv["phone"], cv["email"]] if x)), S["contact"])]
    f += heading("Personal profile") + [Paragraph(esc(p), S["p"]) for p in cv["profile"]]
    f += heading("Key skills")
    sk = cv["skills"] + [""] * ((3 - len(cv["skills"]) % 3) % 3)
    rows = [[Paragraph(esc(s), S["skill"]) for s in sk[i:i+3]] for i in range(0, len(sk), 3)]
    t = Table(rows, colWidths=[(A4[0]-36*mm)/3]*3)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 4),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("TOPPADDING", (0, 0), (-1, -1), 1)]))
    f += [t]
    f += heading("Professional experience")
    for x in cv["experience"]:
        block = [Paragraph(f"{esc(x['company'])} — {esc(x['role'])}", S["role"])]
        meta = " | ".join(v for v in [x.get("location"), x.get("dates")] if v)
        if meta:
            block.append(Paragraph(esc(meta), S["dates"]))
        block += [Paragraph(esc(b), S["b"], bulletText="•") for b in x["bullets"]]
        f.append(KeepTogether(block))
    f += heading("Education & qualifications")
    f += [Paragraph(f"<b>{esc(e['name'])}</b> — {esc(e['detail'])}", S["p"]) for e in cv["education"]]
    f += heading("Career objective") + [Paragraph(esc(cv["objective"]), S["p"])]
    f += heading("References") + [Paragraph(esc(cv.get("references") or "Available upon request."), S["p"])]
    doc.build(f)

def safe_id(s):
    return re.sub(r"[^a-z0-9-]", "", str(s).lower())

if __name__ == "__main__":
    build(BASE, os.path.join(OUT, "base.pdf"), "CV – Rougier Williams")
    n = 0
    for j in JOBS:
        if j.get("cv"):
            build(merged(j["cv"]), os.path.join(OUT, safe_id(j["id"]) + ".pdf"),
                  f"CV – Rougier Williams – {j.get('company','')}")
            n += 1
    print(f"Built base.pdf and {n} tailored CVs")
