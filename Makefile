.PHONY: test eval scan clean

test:
	py -m unittest tests/test_sentinel_core.py

eval:
	py eval_benchmark.py

scan:
	py sentinel.py scan . --out sentinel_architecture.html

clean:
	rm -rf __pycache__ src/__pycache__ tests/__pycache__ *.html
