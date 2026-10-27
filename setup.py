from setuptools import setup, find_packages

setup(
    name="sentinel-ast",
    version="1.0.0",
    description="Zero-cloud AST dependency visualizer and blast-radius engine for Python codebases",
    long_description=open("README.md", encoding="utf-8").read() if open("README.md", encoding="utf-8") else "",
    long_description_content_type="text/markdown",
    author="Manoj Devarajulu",
    author_email="manojdevarajuluad2020@gmail.com",
    url="https://github.com/ManojDevarajulu/Sentinel",
    packages=find_packages(),
    py_modules=["sentinel", "eval_benchmark"],
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "sentinel=sentinel:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
