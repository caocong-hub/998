#!/usr/bin/env python3
"""Print whether pip / pip3 / python3 -m pip are available (macOS often has no `pip` on PATH)."""

import shutil
import subprocess


def main() -> None:
    pip = shutil.which("pip")
    pip3 = shutil.which("pip3")
    py3 = shutil.which("python3")
    m_pip_ok = False
    m_pip_err = ""
    if py3:
        r = subprocess.run(
            [py3, "-m", "pip", "--version"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        m_pip_ok = r.returncode == 0
        m_pip_err = (r.stderr or r.stdout or "").strip()[:200]

    print("pip:", pip or "(not in PATH — normal on macOS Homebrew)")
    print("pip3:", pip3 or "(not in PATH)")
    print("python3:", py3 or "(not in PATH)")
    print("python3 -m pip:", "OK" if m_pip_ok else f"FAIL {m_pip_err}")
    print()
    print("Install API deps with:")
    print("  cd m2 && python3 -m pip install -r requirements.txt")
    print("or: ./install-api-deps.sh")


if __name__ == "__main__":
    main()
