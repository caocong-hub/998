import os
import torch
import torch.nn as nn
import numpy as np
import cv2
import librosa
import time
import re
from pathlib import Path
from PIL import Image
from transformers import (
    Wav2Vec2Processor, Wav2Vec2Model,
    AutoTokenizer, AutoModel,
    AutoImageProcessor, ResNetModel
)

# ================= BACKEND CONFIG =================
_M2_DIR = Path(__file__).resolve().parent
_DEFAULT_IEMOCAP = _M2_DIR / "sample_data" / "IEMOCAP"
_DEFAULT_CKPT = _M2_DIR / "checkpoints" / "best_trimodal_model.pth"


def _resolve_checkpoint_path() -> str:
    env_ckpt = os.environ.get("M2_CHECKPOINT_PATH") or os.environ.get("M4_CHECKPOINT_PATH")
    if env_ckpt:
        return env_ckpt

    candidates = [
        _DEFAULT_CKPT,
        _M2_DIR / "best_trimodal_model.pth",
        _M2_DIR / "best_trimodal_model_模型权重.pth",
    ]
    for p in candidates:
        if p.is_file():
            return str(p)

    for p in sorted((_M2_DIR / "checkpoints").glob("*.pth")):
        if p.is_file():
            return str(p)

    for p in sorted(_M2_DIR.glob("*.pth")):
        if p.is_file():
            return str(p)

    return str(_DEFAULT_CKPT)

IEMOCAP_ROOT = os.environ.get("IEMOCAP_ROOT", str(_DEFAULT_IEMOCAP))
CHECKPOINT_PATH = _resolve_checkpoint_path()

ID2LABEL = {0: 'Neutral', 1: 'Happy', 2: 'Sad', 3: 'Angry'}


# ================================================

# === 🌟 恢复为高分版的：隐式语义锚定门控单元 ===
class SemanticAnchoredGate(nn.Module):
    def __init__(self, target_dim, text_dim=768):
        super().__init__()
        # 隐式参数化网络，自动学习偏离度
        self.attn_net = nn.Sequential(
            nn.Linear(target_dim + text_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, target_feat, text_feat):
        combined = torch.cat((target_feat, text_feat), dim=1)
        score = self.attn_net(combined)
        weighted_feat = target_feat * score
        return weighted_feat, score


# === 主模型 ===
class TrimodalFusionModel(nn.Module):
    def __init__(self, num_labels=4):
        super().__init__()
        self.audio_enc = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base")
        self.text_enc = AutoModel.from_pretrained("bert-base-uncased")
        self.visual_enc = ResNetModel.from_pretrained("microsoft/resnet-18")

        # 使用高分版的语义锚定门控
        self.audio_gate = SemanticAnchoredGate(target_dim=768, text_dim=768)
        self.visual_gate = SemanticAnchoredGate(target_dim=512, text_dim=768)
        self.text_gate = nn.Sequential(
            nn.Linear(768, 64), nn.ReLU(),
            nn.Linear(64, 1), nn.Sigmoid()
        )

        fusion_dim = 768 + 768 + 512
        self.classifier = nn.Sequential(
            nn.Linear(fusion_dim, 512), nn.BatchNorm1d(512),
            nn.ReLU(), nn.Dropout(0.3), nn.Linear(512, 128),
            nn.ReLU(), nn.Linear(128, num_labels)
        )

    def forward(self, a_val, t_ids, t_att, v_pix):
        a_feat = torch.mean(self.audio_enc(a_val).last_hidden_state, dim=1)
        t_feat = self.text_enc(input_ids=t_ids, attention_mask=t_att).last_hidden_state[:, 0, :]
        v_out = self.visual_enc(pixel_values=v_pix)
        if hasattr(v_out, 'pooler_output') and v_out.pooler_output is not None:
            v_feat = v_out.pooler_output.flatten(start_dim=1) if v_out.pooler_output.dim() > 2 else v_out.pooler_output
        else:
            v_feat = torch.mean(v_out.last_hidden_state, dim=[2, 3])

        # 门控处理 (传入 t_feat 作为参考)
        a_w, a_score = self.audio_gate(a_feat, t_feat.detach())
        v_w, v_score = self.visual_gate(v_feat, t_feat.detach())

        t_score = self.text_gate(t_feat)
        t_w = t_feat * t_score

        combined = torch.cat((a_w, t_w, v_w), dim=1)
        logits = self.classifier(combined)
        return logits, a_score, t_score, v_score


def _pick_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class M4Service:
    def __init__(self):
        print("🤖 [Core] Initializing Gated M4 Engine (Implicit Semantic Alignment)...")
        self.device = _pick_device()
        self.a_proc = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")
        self.t_tok = AutoTokenizer.from_pretrained("bert-base-uncased")
        self.v_proc = AutoImageProcessor.from_pretrained("microsoft/resnet-18")

        self.model = TrimodalFusionModel(num_labels=4)
        self.checkpoint_loaded = os.path.exists(CHECKPOINT_PATH)
        if self.checkpoint_loaded:
            # strict=True 保证必须严丝合缝
            self.model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=self.device), strict=True)
            print("✅ [Core] Model Loaded Successfully.")
        else:
            print("❌ [Core] Checkpoint Not Found.")

        self.model.to(self.device)
        self.model.eval()

    def _resolve_paths(self, video_name):
        base_name = video_name.replace(".avi", "")
        match = re.match(r"Ses(\d\d)", base_name)
        session_folder = f"Session{int(match.group(1))}" if match else "Session1"

        txt_path = os.path.join(IEMOCAP_ROOT, session_folder, "dialog/transcriptions", base_name + ".txt")
        wav_dir = os.path.join(IEMOCAP_ROOT, session_folder, "sentences/wav", base_name)
        return txt_path, wav_dir

    def get_transcript_full(self, video_name):
        txt_path, _ = self._resolve_paths(video_name)
        dialogue_flow = []
        if os.path.exists(txt_path):
            with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    match = re.match(r"^(\S+)\s+\[(\d+\.\d+)-(\d+\.\d+)\]:\s+(.*)$", line.strip())
                    if match:
                        uid, start_t, end_t, text = match.groups()
                        role = "Female" if "F" in uid.split("_")[-1] else "Male"
                        if len(text.split()) > 1:
                            dialogue_flow.append({
                                "id": uid, "role": role, "text": text,
                                "start": float(start_t), "end": float(end_t)
                            })
        return dialogue_flow

    def get_preview_data(self, video_path, active_item):
        video_name = os.path.basename(video_path)
        _, wav_dir = self._resolve_paths(video_name)

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        mid_time = (active_item['start'] + active_item['end']) / 2
        frame_points = [active_item['start'], mid_time, active_item['end']]

        film_strip = []
        middle_frame_tensor = None
        for i, t in enumerate(frame_points):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
            ret, frame = cap.read()
            if ret:
                img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                film_strip.append(img)
                if i == 1: middle_frame_tensor = self.v_proc(images=img, return_tensors="pt").pixel_values.to(
                    self.device)
            else:
                film_strip.append(Image.new('RGB', (224, 224)))
        cap.release()
        if middle_frame_tensor is None: middle_frame_tensor = torch.zeros((1, 3, 224, 224)).to(self.device)

        wav_slice_path = os.path.join(wav_dir, active_item['id'] + ".wav")
        audio_preview = wav_slice_path if os.path.exists(wav_slice_path) else None

        return film_strip, audio_preview, middle_frame_tensor

    def predict(self, active_item, middle_frame_tensor, audio_path):
        start_t = time.time()

        if audio_path and os.path.exists(audio_path):
            speech, _ = librosa.load(audio_path, sr=16000)
        else:
            speech = np.random.uniform(-0.1, 0.1, 16000 * 3)

        a_in = self.a_proc(speech, sampling_rate=16000, return_tensors="pt").input_values.to(self.device)
        audio_rms = np.sqrt(np.mean(speech ** 2))

        t_in = self.t_tok(active_item['text'], padding='max_length', max_length=64, truncation=True,
                          return_tensors="pt")
        t_ids, t_att = t_in['input_ids'].to(self.device), t_in['attention_mask'].to(self.device)

        with torch.no_grad():
            logits, a_s, t_s, v_s = self.model(a_in, t_ids, t_att, middle_frame_tensor)

            w_a = a_s.item()
            w_t = t_s.item()
            w_v = v_s.item()

            total = w_a + w_t + w_v + 1e-9
            weights = {"Audio": w_a / total, "Text": w_t / total, "Visual": w_v / total}

        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
        latency_ms = (time.time() - start_t) * 1000
        pred_idx = np.argmax(probs)
        entropy = -np.sum(probs * np.log(probs + 1e-9))

        return {
            "label": ID2LABEL[pred_idx],
            "confidence": float(probs[pred_idx]),
            "probs": probs,
            "entropy": float(entropy),
            "rms": float(audio_rms),
            "latency": latency_ms,
            "labels_map": ID2LABEL,
            "weights": weights
        }