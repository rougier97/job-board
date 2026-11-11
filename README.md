# PLAN

Rougier's automotive job board. Open it at https://rougier97.github.io/job-board/

- `data/jobs.json`: jobs found by the twice-daily search (6:31am and 5:31pm)
- `data/dealers.json`: the dealers watched, with last check and open roles
- `data/cv.json`: master CV. Tailored CVs only reword and reorder, never change facts
- `cvs/`: a tailored CV PDF for each job, built by `python3 tools/make_cvs.py`
- Job statuses (applied, interview and so on) are saved on the device you tap them on
