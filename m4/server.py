"""FastAPI wrapper for M4Service (trimodal emotion). Run from `m4/`: uvicorn server:app --host 127.0.0.1 --port 8765"""

from __future__ import annotations

import base64
import io
import os
from pathlib import Path

import cv2
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from PIL import Image

from m4_core import CHECKPOINT_PATH, IEMOCAP_ROOT, ID2LABEL, M4Service

_engine: M4Service | None = None


def get_engine() -> M4Service:
    global _engine
    if _engine is None:
        _engine = M4Service()
    return _engine


def _cors_origins() -> list[str]:
    raw = os.environ.get("M4_CORS_ORIGINS", "http://localhost:3000")
    return [o.strip() for o in raw.split(",") if o.strip()]


def list_session_names() -> list[str]:
    root = Path(IEMOCAP_ROOT)
    names: list[str] = []
    for i in range(1, 32):
        p = root / f"Session{i}"
        if p.is_dir():
            names.append(f"Session{i}")
    return names


def video_dir_for_session(session: str) -> Path | None:
    root = Path(IEMOCAP_ROOT)
    divx = root / session / "dialog" / "avi" / "DivX"
    if divx.is_dir():
        return divx
    avi = root / session / "dialog" / "avi"
    if avi.is_dir():
        return avi
    return None


def resolve_video_path(session: str, video_name: str) -> str | None:
    d = video_dir_for_session(session)
    if not d:
        return None
    p = d / video_name
    return str(p) if p.is_file() else None


def pil_to_jpeg_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")


app = FastAPI(title="M4 Trimodal API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    eng = get_engine()
    return {
        "ok": True,
        "checkpoint_loaded": eng.checkpoint_loaded,
        "iemocap_root": IEMOCAP_ROOT,
        "checkpoint_path": CHECKPOINT_PATH,
    }


@app.get("/sessions")
def sessions():
    return {"sessions": list_session_names()}


@app.get("/sessions/{session}/videos")
def session_videos(session: str):
    if session not in list_session_names():
        raise HTTPException(
            status_code=404,
            detail={"error": "session_not_found", "message": f"No such session: {session}"},
        )
    d = video_dir_for_session(session)
    if not d:
        return {"session": session, "videos": [], "message": "No dialog/avi directory (add IEMOCAP video files)."}
    names = sorted([p.name for p in d.glob("*.avi")])
    return {"session": session, "videos": [{"name": n} for n in names]}


@app.get("/sessions/{session}/dialogue")
def session_dialogue(session: str, video: str = Query(..., description="e.g. Ses01F_impro01.avi")):
    if session not in list_session_names():
        raise HTTPException(
            status_code=404,
            detail={"error": "session_not_found", "message": f"No such session: {session}"},
        )
    eng = get_engine()
    dialogue = eng.get_transcript_full(video)
    return {"session": session, "video": video, "dialogue": dialogue, "count": len(dialogue)}


@app.get("/sessions/{session}/utterance-audio")
def utterance_audio(
    session: str,
    video: str = Query(..., description="e.g. Ses01F_impro01.avi"),
    utterance_index: int = Query(..., ge=0, description="Index into dialogue list"),
):
    """Serve the sentence-level wav slice if it exists under sentences/wav (same path as /predict)."""
    if session not in list_session_names():
        raise HTTPException(
            status_code=404,
            detail={"error": "session_not_found", "message": f"No such session: {session}"},
        )
    video_path = resolve_video_path(session, video)
    if not video_path:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "video_not_found",
                "message": "Video file not found under dialog/avi (or DivX).",
            },
        )
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        cap.release()
        raise HTTPException(
            status_code=400,
            detail={"error": "video_open_failed", "message": f"Cannot open video: {video_path}"},
        )
    cap.release()

    eng = get_engine()
    dialogue = eng.get_transcript_full(video)
    if not dialogue:
        raise HTTPException(
            status_code=400,
            detail={"error": "no_transcript", "message": "No dialogue for this video."},
        )
    if utterance_index >= len(dialogue):
        raise HTTPException(
            status_code=400,
            detail={"error": "index_out_of_range", "message": f"utterance_index must be < {len(dialogue)}"},
        )
    active_item = dialogue[utterance_index]
    _, audio_path, _ = eng.get_preview_data(video_path, active_item)
    if not audio_path or not os.path.exists(audio_path):
        raise HTTPException(
            status_code=404,
            detail={"error": "audio_not_found", "message": "No wav slice for this utterance (sentences/wav)."},
        )
    return FileResponse(
        audio_path,
        media_type="audio/wav",
        filename=os.path.basename(audio_path),
    )


class PredictBody(BaseModel):
    session: str = Field(..., description="e.g. Session1")
    video: str = Field(..., description="AVI file name under dialog/avi")
    utterance_index: int = Field(..., ge=0)


@app.post("/predict")
def predict(body: PredictBody):
    if body.session not in list_session_names():
        raise HTTPException(
            status_code=404,
            detail={"error": "session_not_found", "message": f"No such session: {body.session}"},
        )

    video_path = resolve_video_path(body.session, body.video)
    if not video_path:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "video_not_found",
                "message": "Video file not found under dialog/avi (or DivX). Add .avi files to run preview and predict.",
            },
        )

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        cap.release()
        raise HTTPException(
            status_code=400,
            detail={"error": "video_open_failed", "message": f"Cannot open video: {video_path}"},
        )
    cap.release()

    eng = get_engine()
    dialogue = eng.get_transcript_full(body.video)
    if not dialogue:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "no_transcript",
                "message": "No dialogue lines parsed for this video (check transcriptions/*.txt).",
            },
        )
    if body.utterance_index >= len(dialogue):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "index_out_of_range",
                "message": f"utterance_index must be < {len(dialogue)}",
            },
        )

    active_item = dialogue[body.utterance_index]
    film_strip, audio_path, tensor_cache = eng.get_preview_data(video_path, active_item)
    result = eng.predict(active_item, tensor_cache, audio_path)

    frames_b64 = [pil_to_jpeg_b64(im) for im in film_strip]
    probs = result["probs"]
    if hasattr(probs, "tolist"):
        probs_list = probs.tolist()
    else:
        probs_list = list(probs)

    labels_map = {str(k): v for k, v in result["labels_map"].items()}

    return {
        "label": result["label"],
        "confidence": result["confidence"],
        "probs": probs_list,
        "entropy": result["entropy"],
        "rms": result["rms"],
        "latency_ms": result["latency"],
        "labels_map": labels_map,
        "labels_order": [ID2LABEL[i] for i in range(len(ID2LABEL))],
        "weights": result["weights"],
        "preview": {
            "frames_base64": frames_b64,
            "audio_available": bool(audio_path and os.path.exists(audio_path)),
        },
        "utterance": active_item,
        "session": body.session,
        "video": body.video,
        "utterance_index": body.utterance_index,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8765, reload=False)
