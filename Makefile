.PHONY: test eval scan clean

PYTHON ?= python

test:
	$(PYTHON) -m unittest tests/test_sentinel_core.py

eval:
	$(PYTHON) eval_benchmark.py

scan:
	$(PYTHON) sentinel.py scan . --out sentinel_architecture.html

clean:
	rm -rf __pycache__ src/__pycache__ tests/__pycache__ *.html
