.PHONY: test eval scan serve clean

PYTHON ?= python

test:
	$(PYTHON) -m unittest discover tests

eval:
	$(PYTHON) eval_benchmark.py

scan:
	$(PYTHON) sentinel.py scan . --out sentinel_architecture.html

serve:
	$(PYTHON) sentinel.py serve . --port 7331

clean:
	rm -rf __pycache__ src/__pycache__ tests/__pycache__ *.html
