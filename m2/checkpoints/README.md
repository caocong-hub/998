# Fusion model checkpoint

The trimodal fusion weights are **not** committed to Git (large binary).

1. Obtain `best_trimodal_model.pth` (or your team’s equivalent, e.g. `best_trimodal_model_模型权重.pth`) from your training run (same architecture as `TrimodalFusionModel` in `m2_core.py`).
2. Place it here as **`m2/checkpoints/best_trimodal_model.pth`**, or keep a large file in `m2/` under another name and create a symlink:

   ```bash
   cd m2/checkpoints && ln -sf ../best_trimodal_model_模型权重.pth best_trimodal_model.pth
   ```

3. Or set an absolute path in the environment before starting uvicorn:

   ```bash
   export M2_CHECKPOINT_PATH=/path/to/your/best_trimodal_model.pth
   ```

4. Restart the FastAPI process. `/health` should report `"checkpoint_loaded": true`.

Until a valid file is present, the service runs with **random classifier weights**; emotion predictions are not meaningful.
