import streamlit as st
import glob
import os
import json
import time
import pandas as pd
import plotly.express as px
from m4_core import IEMOCAP_ROOT, M4Service

st.set_page_config(page_title="Multimodal Agent", page_icon="🧠", layout="wide")

st.markdown("""
<style>
    .chat-bubble { padding: 10px; border-radius: 8px; margin-bottom: 5px; font-size: 14px; }
    .chat-active { background-color: #dbeafe; border-left: 5px solid #2563eb; color: #1e3a8a; }
    .chat-context { background-color: #f3f4f6; color: #9ca3af; }
    .stSelectbox label { font-weight: bold; font-size: 16px; color: #4e8cff; }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def get_engine(): return M4Service()


engine = get_engine()

# --- Sidebar ---
with st.sidebar:
    st.title("🎛️ Control Panel")

    # 1. 选择 Session (新增功能！)
    st.markdown("### 1. Select Dataset Session")
    available_sessions = []
    for i in range(1, 32):
        s_path = os.path.join(IEMOCAP_ROOT, f"Session{i}")
        if os.path.exists(s_path):
            available_sessions.append(f"Session{i}")

    if not available_sessions:
        st.error("No IEMOCAP Sessions found!")
        st.stop()

    current_session = st.selectbox("Load Session", available_sessions, index=0, label_visibility="collapsed")

    # 2. 动态扫描该 Session 下的视频
    video_dir = os.path.join(IEMOCAP_ROOT, current_session, "dialog/avi/DivX")
    if not os.path.exists(video_dir):
        # 兼容性：有的 Session 视频可能不在 DivX 下，而在 avi 直接目录下
        video_dir = os.path.join(IEMOCAP_ROOT, current_session, "dialog/avi")

    video_files = sorted(glob.glob(os.path.join(video_dir, "*.avi")))
    video_names = [os.path.basename(f) for f in video_files]

    st.markdown(f"### 2. Select Video Source ({len(video_names)} files)")
    if not video_names:
        st.warning(f"No avi files in {current_session}")
        st.stop()

    selected_video = st.selectbox("Video List", video_names, index=0, label_visibility="collapsed")
    video_path = os.path.join(video_dir, selected_video)

    # 3. 获取剧本
    dialogue_list = engine.get_transcript_full(selected_video)

    st.markdown("### 3. Select Dialogue Segment")
    if not dialogue_list:
        st.error("No transcript available.")
        active_item = None
    else:
        options = [f"{i}: [{item['role']}] {item['text'][:40]}..." for i, item in enumerate(dialogue_list)]
        selected_idx_str = st.selectbox("Select sentence", options, index=0, label_visibility="collapsed")
        selected_idx = int(selected_idx_str.split(":")[0])
        active_item = dialogue_list[selected_idx]

    st.divider()
    st.success(f"✅ Loaded: {current_session}")
    #st.success("✅ M4 Chip Accelerated")

    # 获取预览
    film_strip, audio_path, tensor_cache = engine.get_preview_data(video_path, active_item)

# --- Main Interface ---
st.title("🧠 Multimodal Emotion Perception")
st.write("")

col_input, col_result = st.columns([1.6, 1])

# Left
with col_input:
    st.subheader("📡 Input Modalities")
    st.caption(f"1️⃣ Visual Stream")
    cols = st.columns(3)
    for i, img in enumerate(film_strip): cols[i].image(img, caption=f"Frame {i + 1}", use_container_width=True)

    st.caption("2️⃣ Audio Stream")
    if audio_path and os.path.exists(audio_path):
        st.audio(audio_path, format='audio/wav')
    else:
        st.warning("Audio slice not found (Check sentences/wav path).")

    st.caption("3️⃣ Text Stream")
    with st.container(border=True, height=280):
        if active_item:
            start = max(0, selected_idx - 2)
            end = min(len(dialogue_list), selected_idx + 3)
            for i in range(start, end):
                item = dialogue_list[i]
                is_target = (i == selected_idx)
                css = "chat-active" if is_target else "chat-context"
                icon = "🗣️" if is_target else "..."
                st.markdown(f"<div class='chat-bubble {css}'>{icon} <b>{item['text']}</b></div>",
                            unsafe_allow_html=True)

# Right
with col_result:
    analyze_btn = st.button(f"🚀 Analyze Segment: {active_item['id'] if active_item else 'N/A'}", type="primary",
                            use_container_width=True)

    if analyze_btn:
        with st.spinner("Fusing Modalities..."):
            if active_item:
                res = engine.predict(active_item, tensor_cache, audio_path)
                st.session_state.last_result = res
                st.session_state.last_id = active_item['id']
                st.rerun()

    if 'last_result' in st.session_state and st.session_state.get('last_id') == active_item['id']:
        res = st.session_state.last_result
        st.write("")

        m1, m2 = st.columns(2)
        m1.metric("Prediction", res['label'].upper())
        m2.metric("Confidence", f"{res['confidence']:.1%}")

        st.markdown("#### 📊 Probability")
        for idx, prob in enumerate(res['probs']):
            label = res['labels_map'][idx]
            if label == res['label']:
                st.progress(float(prob), text=f"**{label}: {prob:.1%}**")
            else:
                st.progress(float(prob), text=f"{label}: {prob:.1%}")

        st.markdown("#### ⚖️ Disambiguation (Weights)")
        weights = res['weights']
        df_radar = pd.DataFrame(dict(
            r=[weights['Audio'], weights['Text'], weights['Visual']],
            theta=['Audio', 'Text', 'Visual'],
            val=[f"{v:.1%}" for v in weights.values()]
        ))
        fig = px.line_polar(df_radar, r='r', theta='theta', line_close=True, text='val')
        fig.update_traces(fill='toself', line_color='#3B82F6', textposition="top center")
        fig.update_layout(height=220, margin=dict(t=30, b=20, l=40, r=40),
                          polar=dict(radialaxis=dict(visible=True, range=[0, 1])))
        st.plotly_chart(fig, use_container_width=True)

        st.markdown("#### 📡 JSON Signal")
        action = "MAINTAIN"
        if res['label'] in ['Sad', 'Angry']:
            action = "TRIGGER_INTERVENTION"
        elif res['label'] == 'Happy':
            action = "INCREASE_DIFFICULTY"
        st.json({"source": "module2", "id": active_item['id'], "state": res['label'], "action": action})

    elif not analyze_btn:
        st.info("👈 Select a segment and click Analyze.")