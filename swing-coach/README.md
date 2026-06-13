# ⚾ Swing Coach AI

Record a baseball/softball swing from your webcam and get coached by GPT-4o
(OpenAI's "omni" multimodal model). It grades four phases — stance, load,
swing, follow-through — and gives you strengths, fixes, and drills.

## How it works
1. **Browser** grabs ~10 frames across your swing from the webcam.
2. **Flask backend** sends those frames to GPT-4o vision with a hitting-coach
   prompt (your API key stays on the server, never in the browser).
3. GPT-4o returns scored JSON, which the page renders as bars + feedback.

## Setup
```bash
cd swing-coach
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # then paste your OpenAI key into .env
python app.py
```
Open http://localhost:5000, click **Enable camera**, stand side-on so the
camera sees your whole swing, then **Record swing**.

## Notes
- GPT-4o doesn't ingest video directly, so we send a burst of still frames.
- Frames are sent at `detail: low` to keep cost down (~a cent or two a swing).
- Tweak `FRAME_COUNT` / `SWING_MS` in `static/app.js` to capture more or
  fewer frames over a longer/shorter window.

## Ideas / backlog
- Side-by-side compare vs. a pro swing
- Save swing history + track score over time
- Slow-mo playback of the captured frames
