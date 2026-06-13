"""
Swing Coach AI — Flask backend.
Receives a burst of webcam frames from the browser, sends them to OpenAI
GPT-4o (vision), and returns scored coaching feedback as JSON.

Run:
    pip install -r requirements.txt
    cp .env.example .env   # then paste your OpenAI key into .env
    python app.py
    open http://localhost:5000
"""
import os
import json

from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

app = Flask(__name__, static_folder="static", static_url_path="")

# The coach's instructions. We force a strict JSON shape so the frontend
# can render scores + feedback reliably.
SYSTEM_PROMPT = """You are an expert baseball/softball hitting coach.
You will be shown a sequence of still frames captured from a single swing,
in time order. Analyze the mechanics across four phases and respond.

Return ONLY valid JSON with exactly this shape:
{
  "scores": {
    "stance":         <int 0-100>,
    "load":           <int 0-100>,
    "swing":          <int 0-100>,
    "follow_through": <int 0-100>
  },
  "overall": <int 0-100>,
  "summary": "<2-3 sentence plain-English overview>",
  "strengths": ["<short bullet>", "..."],
  "fixes": ["<short, specific bullet>", "..."],
  "drills": ["<one concrete drill the hitter can do>", "..."]
}

Be encouraging but honest. If the frames are too blurry or you can't see a
real swing, set all scores to 0 and say so in the summary."""


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    frames = data.get("frames", [])

    if not frames:
        return jsonify({"error": "No frames received."}), 400

    # Cap the number of frames we send to keep cost/latency sane.
    frames = frames[:12]

    if not client.api_key:
        return jsonify({"error": "Server is missing OPENAI_API_KEY. "
                                 "Add it to your .env file."}), 500

    # Build the vision message: instruction text + each frame as an image.
    content = [{
        "type": "text",
        "text": f"Here are {len(frames)} frames of one swing, in order. "
                "Analyze it."
    }]
    for f in frames:
        content.append({
            "type": "image_url",
            # frames arrive as full data URLs (data:image/jpeg;base64,...)
            "image_url": {"url": f, "detail": "low"},
        })

    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            response_format={"type": "json_object"},
            max_tokens=700,
        )
        result = json.loads(resp.choices[0].message.content)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {e}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
