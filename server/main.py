from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import tempfile
import os
import json
import time
from dotenv import load_dotenv

# load stuff from .env (basic setup)
load_dotenv()

app = FastAPI()

# CORS... probably enough for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# get API key
_api = os.getenv("GEMINI_API_KEY")
if not _api:
    raise RuntimeError("Add GEMINI_API_KEY to .env or this won't work")

# configure gemini
genai.configure(api_key=_api)

# I just put the assignment prompt here; cleaned a bit
PROMPT = (
    "Listen to this classroom audio and pick 3-5 instructional moments "
    "that matter (good or bad). For each one, give: timestamp (MM:SS), a short "
    "principle name, and one sentence about what happened.\n"
    "ONLY return this exact JSON shape:\n"
    "{ \"feedback\": [ {\"timestamp\": \"MM:SS\", \"principle\": \"title\", "
    "\"description\": \"one sentence\"} ] }\n"
    "Do NOT add extra text or markdown."
)


@app.get("/")
async def index():
    return {"ok": True}


def wait_until_ready(file_id: str, timeout=120):
    """poll the Gemini file until it's ready."""
    t0 = time.time()
    while True:
        try:
            info = genai.get_file(file_id)
        except Exception as e:
            # sometimes Gemini takes a sec to register the file
            time.sleep(1)
            continue

        state = getattr(info, "state", None)
        sname = getattr(state, "name", "")

        if sname == "ACTIVE":
            return info
        if sname == "FAILED":
            raise RuntimeError("Gemini couldn't process the audio file.")
        if time.time() - t0 > timeout:
            raise TimeoutError("File took too long to process.")

        # just wait and try again
        time.sleep(2)


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    # quick sanity check
    if not file.content_type.startswith("audio/"):
        raise HTTPException(400, "Upload an audio file please.")

    # temporary file location
    ext = os.path.splitext(file.filename)[-1]
    temp_f = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_path = temp_f.name
    temp_f.close()

    try:
        # write contents into temp file
        data = await file.read()
        with open(temp_path, "wb") as out:
            out.write(data)

        # upload to gemini (old SDK style)
        try:
            uploaded = genai.upload_file(temp_path)
        except Exception as up_err:
            raise HTTPException(500, f"Could not upload file: {up_err}")

        # wait until Gemini says READY
        try:
            ready_file = wait_until_ready(uploaded.name)
        except Exception as e:
            # cleanup remote
            try:
                genai.delete_file(uploaded.name)
            except:
                pass
            raise HTTPException(500, str(e))

        # run the model
        model = genai.GenerativeModel("models/gemini-2.5-flash")  # you can swap model
        try:
            resp = model.generate_content([ready_file, PROMPT])
        except Exception as gen_err:
            raise HTTPException(500, f"Model error: {gen_err}")

        text = (resp.text or "").strip()

        # clean markdown fences if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()

        # parse JSON output
        try:
            out_json = json.loads(text)
        except Exception:
            raise HTTPException(500, "Response from AI wasn't valid JSON.")

        # cleanup remote file
        try:
            genai.delete_file(uploaded.name)
        except:
            pass

        return out_json

    finally:
        # always remove temp file
        try:
            os.remove(temp_path)
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    # run on localhost for dev
    uvicorn.run(app, host="0.0.0.0", port=8000)


