# M2 — Trimodal emotion (IEMOCAP)

Python stack: PyTorch, **torchvision**（ResNet / `AutoImageProcessor` 必需）, transformers, OpenCV, librosa.

## Configuration

| Variable | Default | Meaning |
|----------|---------|---------|
| `IEMOCAP_ROOT` | `m2/sample_data/IEMOCAP` | Root folder containing `SessionN/dialog/...` |
| `M2_CHECKPOINT_PATH` | `m2/checkpoints/best_trimodal_model.pth` | Fusion model weights |
| `M2_CORS_ORIGINS` | `http://localhost:3000` | Comma-separated origins for the FastAPI server |

Place your checkpoint file at [`checkpoints/best_trimodal_model.pth`](checkpoints/README.md) or set `M2_CHECKPOINT_PATH` (see [`m2/.env.example`](.env.example)). The repository does **not** ship the `.pth` file; without it, inference uses random classifier weights.

## Sample data limits

The bundled `sample_data/IEMOCAP` includes **transcriptions** under `Session1`–`Session5`. It does **not** include `dialog/avi` or `sentences/wav`. Without `.avi` files, the REST `/predict` endpoint returns **400** (`video_not_found`). For full visual + audio preview, mount a complete IEMOCAP tree or copy `dialog/avi` and `sentences/wav` into the same layout.

## Install (API)

`requirements.txt` 已包含 **torch、torchvision、transformers、opencv、librosa、FastAPI** 等运行 `m2_core` + `server.py` 所需的包。

macOS 上若出现 **`pip: command not found`**，请用 **`python3 -m pip`** 或 **`pip3`**。

**推荐：独立虚拟环境（避免污染系统 Python）**

```bash
cd m2
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

**或直接安装到当前 Python**

```bash
cd m2
python3 -m pip install -r requirements.txt
# 或：./install-api-deps.sh
```

可选：运行 **Streamlit**（`app_main.py`）时再装：

```bash
python -m pip install -r requirements-streamlit.txt
```

若不确定环境，可运行：`python3 diagnose_pip.py`

## Run FastAPI

```bash
cd m2
uvicorn server:app --host 127.0.0.1 --port 8765
```

- `GET /health` — `checkpoint_loaded`, paths.
- `GET /sessions` — available `SessionN` folders.
- `GET /sessions/{session}/videos` — `.avi` list.
- `GET /sessions/{session}/dialogue?video=Ses01F_impro01.avi` — parsed lines.
- `GET /sessions/{session}/utterance-audio?video=...&utterance_index=...` — `audio/wav` if `sentences/wav` slice exists (for LMS player).
- `POST /predict` — JSON `{ "session", "video", "utterance_index" }`.

## Run Streamlit UI (legacy)

```bash
cd m2
streamlit run app_main.py
```

Uses the same `IEMOCAP_ROOT` as `m2_core.py`.
