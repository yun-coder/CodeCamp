from setuptools import find_packages, setup

setup(
    name="sam-agent-tool",
    version="1.0.0",
    description="SAM-powered segmentation tool for agent workflows — auto segment, prompt segment, box segment with structured JSON output.",
    author="",
    install_requires=[
        "numpy",
        "opencv-python",
        "torch",
        "torchvision",
        "fastapi",
        "uvicorn",
        "python-multipart",
        "segment_anything @ git+https://github.com/facebookresearch/segment-anything.git",
    ],
    packages=find_packages(exclude=["examples", "tests"]),
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "sam-tool = sam_agent_tool.cli:main",
        ],
    },
)
