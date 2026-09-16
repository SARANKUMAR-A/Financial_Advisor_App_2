"""
Backend requirements definition and automated installer.

Usage:
    - As a standalone script to install dependencies:
        python backend/requirements.py
    - As a module:
        from requirements import REQUIREMENTS
    - To generate requirements.txt:
        python backend/requirements.py --generate-txt
"""

import subprocess
import sys
from pathlib import Path

# Core backend dependencies
REQUIREMENTS = [
    "Django>=5.2.0,<6.0.0",
    "djangorestframework>=3.15.0",
    "djangorestframework-simplejwt>=5.4.0",
    "django-cors-headers>=4.7.0",
    "pandas>=2.2.0",
    "numpy>=1.26.0",
    "openpyxl>=3.1.2",
    "xlrd>=2.0.1",
    "requests>=2.32.0",
    "python-dotenv>=1.0.0",
    "pillow>=10.0.0",
    "psycopg2>=2.9.9",
    "celery>=5.4.0",
    "redis>=5.0.0",
]


def install_requirements(upgrade: bool = False):
    """Installs backend requirements using pip."""
    cmd = [sys.executable, "-m", "pip", "install"]
    if upgrade:
        cmd.append("--upgrade")
    cmd.extend(REQUIREMENTS)

    print(f"Installing {len(REQUIREMENTS)} backend dependencies...")
    try:
        subprocess.check_call(cmd)
        print("\nAll backend requirements installed successfully!")
    except subprocess.CalledProcessError as err:
        print(f"\nFailed to install dependencies (exit code {err.returncode})", file=sys.stderr)
        sys.exit(err.returncode)


def generate_txt():
    """Generates requirements.txt in the same directory."""
    req_file = Path(__file__).resolve().parent / "requirements.txt"
    with open(req_file, "w", encoding="utf-8") as f:
        f.write("# Backend dependencies generated from requirements.py\n")
        for req in REQUIREMENTS:
            f.write(f"{req}\n")
    print(f"Generated: {req_file}")


if __name__ == "__main__":
    generate_txt()
    if "--generate-txt" not in sys.argv and "--no-install" not in sys.argv:
        install_requirements(upgrade="--upgrade" in sys.argv)
